import type { PreviewMedia } from "../data/projectPreviews";
import { localizedMediaUrl } from "./localizedMediaClient";
import { createPreviewBudget, heavyLimit } from "./previewBudget.mjs";

// Общий интервал после первой смены (миллисекунды).
const MEDIA_INTERVAL_MS = 3500;
let modelModule: typeof import("./modelPreview") | undefined;

// Видео и 3D-модели ограничены общим бюджетом на всю страницу; картинки не ограничены.
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const coarsePointer = matchMedia("(pointer: coarse)");
const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
const budget = createPreviewBudget(0);
const refreshBudgetLimit = () => budget.setLimit(heavyLimit({
	reducedMotion: reducedMotion.matches, saveData, coarsePointer: coarsePointer.matches,
	cores: navigator.hardwareConcurrency || 4,
}));
refreshBudgetLimit();
reducedMotion.addEventListener("change", refreshBudgetLimit);
coarsePointer.addEventListener("change", refreshBudgetLimit);

class MediaPreview extends HTMLElement {
	items: PreviewMedia[] = [];
	index = -1;
	visible = false;
	timer?: ReturnType<typeof setTimeout>;
	// Каждая карточка получает свою первую задержку один раз при создании.
	nextDelay = 1000 + Math.floor(Math.random() * 4001);
	deadline = 0;
	observer?: IntersectionObserver;
	events?: AbortController;
	failed = new Set<number>();
	prepared = new Map<number, HTMLElement>();
	shownInCycle = new Set<number>();
	pending = new Set<number>();
	hot = false;
	get running() { return this.visible && !document.hidden && this.isConnected; }
	isHeavy(index: number) { const kind = this.items[index]?.kind; return kind === "video" || kind === "model"; }
	heavyInUse() { return [...this.prepared.keys(), ...this.pending].some(index => this.isHeavy(index)); }
	canUseHeavy() { return budget.tryAcquire(this, { priority: this.hot }); }
	refreshBudget() { if (!this.heavyInUse()) budget.release(this); }
	// Called by the budget when a hovered/focused card takes this card's slot.
	yieldHeavy() {
		this.prepared.forEach((element, index) => {
			if (!this.isHeavy(index)) return;
			modelModule?.updateModelPreview(element, false);
			if (element instanceof HTMLVideoElement) element.pause();
		});
	}
	connectedCallback() {
		this.items = (JSON.parse(this.dataset.items ?? "[]") as PreviewMedia[]).map((item, templateIndex) => ({...item, templateIndex}));
		if (!this.items.length) return;
		this.events = new AbortController();
		const options = { signal: this.events.signal };
		document.addEventListener("visibilitychange", () => this.sync(), options);
		document.addEventListener("portfolio:language-change", () => {
			for (const element of this.prepared.values()) {
				if (element instanceof HTMLImageElement) {
					const src = localizedMediaUrl(element.src);
					if (element.src !== new URL(src, document.baseURI).href) element.src = src;
				}
				if (element instanceof HTMLVideoElement) {
					let changed = false;
					for (const source of element.querySelectorAll("source")) {
						const src = localizedMediaUrl(source.src);
						if (source.src !== new URL(src, document.baseURI).href) { source.src = src; changed = true; }
					}
					if (element.poster) element.poster = localizedMediaUrl(element.poster);
					if (changed) element.load();
				}
			}
			this.updateVideo();
		}, options);
		const initial = this.querySelector<HTMLElement>(".slide");
		if (initial && (this.items[0].kind === "image" || this.items[0].kind === "shaderGraph")) {
			this.prepared.set(0, initial); this.index = 0;
			this.shownInCycle.add(0);
		}
		// Animate cards that are meaningfully on screen.
		this.observer = new IntersectionObserver((entries) => {
			const entry = entries[entries.length - 1];
			this.visible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
			this.sync();
		}, { threshold: [0, 0.2] });
		this.observer.observe(this);
		// Pointer or keyboard focus gives this card priority for a heavy slot.
		const card = this.closest("li") ?? this.parentElement;
		const setHot = (hot: boolean) => { if (this.hot === hot) return; this.hot = hot; this.sync(); };
		card?.addEventListener("pointerenter", (event) => { if ((event as PointerEvent).pointerType !== "touch") setHot(true); }, options);
		card?.addEventListener("pointerleave", () => setHot(false), options);
		card?.addEventListener("focusin", () => setHot(true), options);
		card?.addEventListener("focusout", () => setHot(false), options);
	}
	disconnectedCallback() {
		this.stopTimer(); this.observer?.disconnect(); this.events?.abort();
		this.prepared.forEach((element) => this.release(element));
		this.prepared.clear();
		budget.release(this);
	}
	sync() {
		this.updateVideo();
		if (!this.running) { this.stopTimer(); return; }
		this.preload();
		if (this.items.length > 1 && this.timer === undefined) {
			this.deadline = performance.now() + this.nextDelay;
			this.timer = setTimeout(() => {
				this.timer = undefined;
				this.advance();
				this.nextDelay = MEDIA_INTERVAL_MS;
				this.sync();
			}, this.nextDelay);
		}
	}
	stopTimer() {
		if (this.timer === undefined) return;
		// Продолжаем оставшееся время при возвращении карточки на экран.
		this.nextDelay = Math.max(0, this.deadline - performance.now());
		clearTimeout(this.timer);
		this.timer = undefined;
	}
	updateVideo() {
		this.dataset.previewRunning = String(this.running);
		// An offscreen card gives its heavy slot back; it is taken again when visible.
		if (!this.running) budget.release(this);
		this.prepared.forEach((element, index) => {
			const play = this.running && index === this.index && (!this.isHeavy(index) || this.canUseHeavy());
			modelModule?.updateModelPreview(element, play);
			if (!(element instanceof HTMLVideoElement)) return;
			if (play) void element.play().catch(() => {});
			else element.pause();
		});
	}
	preload() {
		if (!this.running) return;
		// Keep the current slide plus one candidate; heavy media needs a budget slot.
		let candidates = this.items.map((_, index) => index).filter(index => index !== this.index && !this.failed.has(index) && !this.shownInCycle.has(index));
		if (!candidates.length) candidates = this.items.map((_, index) => index).filter(index => index !== this.index && !this.failed.has(index));
		candidates = candidates.filter(index => !this.prepared.has(index) && !this.pending.has(index));
		if (this.heavyInUse()) candidates = candidates.filter(index => !this.isHeavy(index));
		while (candidates.length && this.pending.size + this.prepared.size < 2 && this.pending.size < 1) {
			const index = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
			if (this.isHeavy(index) && !this.canUseHeavy()) { candidates = candidates.filter(other => !this.isHeavy(other)); continue; }
			this.pending.add(index);
			void this.prepare(this.items[index], index).then((element) => {
				if (!this.isConnected) { this.release(element); return; }
				this.prepared.set(index, element);
				if (this.index < 0 && this.running) this.show(index);
			}).catch((error) => {
				this.failed.add(index);
				console.warn("[Portfolio preview] Skipping unavailable media:", this.items[index].src, error);
			}).finally(() => { this.pending.delete(index); this.refreshBudget(); this.preload(); });
		}
	}

	advance() {
		if (!this.running) return;
		// Finish every non-failed item before starting another random cycle.
		const remaining = this.items.map((_, index) => index)
			.filter(index => !this.shownInCycle.has(index) && !this.failed.has(index));
		if (!remaining.length) {
			this.shownInCycle.clear();
		}
		const candidates = [...this.prepared.keys()]
			.filter(index => index !== this.index && !this.shownInCycle.has(index))
			.filter(index => !this.isHeavy(index) || this.canUseHeavy());
		if (candidates.length) {
			this.show(candidates[Math.floor(Math.random() * candidates.length)]);
		}
		this.preload();
	}
	show(index: number) {
		const element = this.prepared.get(index)!;
		const old = [...this.querySelectorAll<HTMLElement>(".slide")].filter((node) => node !== element);
		element.className = `slide${this.items[index].kind === "model" ? " model" : this.items[index].kind === "code" ? " code-preview" : this.items[index].kind === "shaderGraph" ? " graph-preview" : this.items[index].kind === "atlas" ? " atlas-preview" : ""}`;
		this.querySelector(".preview-layers")?.append(element);
		element.classList.add("active");
		// Explicit keyframes also work when a detached, cached element is reused.
		element.animate([{ opacity: 0 }, { opacity: 1 }], {
			duration: 1200, easing: "cubic-bezier(0.4, 0, 0.2, 1)",
		});
		old.forEach((node) => {
			node.classList.remove("active");
			node.animate([{ opacity: 1 }, { opacity: 0 }], {
				duration: 1200, easing: "cubic-bezier(0.4, 0, 0.2, 1)",
			});
		});
		for (const [oldIndex, oldElement] of this.prepared) {
			if (oldIndex === index || !old.includes(oldElement)) continue;
			modelModule?.updateModelPreview(oldElement, false);
			this.prepared.delete(oldIndex);
		}
		this.refreshBudget();
		setTimeout(() => old.forEach((node) => { node.remove(); this.release(node); }), 1250);
		this.index = index;
		this.shownInCycle.add(index);
		modelModule?.updateModelPreview(element, this.running, this.timer === undefined ? MEDIA_INTERVAL_MS : Math.max(1, this.deadline - performance.now()));
		this.updateVideo();
	}
	release(element: HTMLElement) {
		modelModule?.releaseModelPreview(element);
		if (element instanceof HTMLVideoElement) { element.pause(); element.removeAttribute("src"); element.replaceChildren(); element.load(); }
		this.refreshBudget();
	}
	async prepare(item: PreviewMedia, index: number): Promise<HTMLElement> {
		if (item.kind === "atlas") {
			const image = await this.image(item.src);
			const bounds = item.bounds ?? {x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight};
			const canvas = document.createElement("canvas");
			const scale = Math.min(1, 1536 / Math.max(bounds.width, bounds.height));
			canvas.width = Math.max(1, Math.round(bounds.width * scale));
			canvas.height = Math.max(1, Math.round(bounds.height * scale));
			const context = canvas.getContext("2d");
			if (!context) throw new Error("Atlas preview unavailable");
			context.imageSmoothingEnabled = false;
			// Draw the complete occupied atlas once; motion uses CSS transforms only.
			context.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, canvas.width, canvas.height);
			const layer = document.createElement("div");
			layer.style.setProperty("--atlas-ratio", String(canvas.width / canvas.height));
			layer.style.setProperty("--atlas-duration", `${MEDIA_INTERVAL_MS}ms`);
			layer.append(canvas);
			return layer;
		}
		if (item.kind === "code") {
			const template = this.querySelector<HTMLTemplateElement>(`template[data-preview-code="${item.templateIndex ?? index}"]`);
			const element = template?.content.firstElementChild?.cloneNode(true);
			if (!(element instanceof HTMLElement)) throw new Error("Code preview unavailable");
			return element;
		}
		if (item.kind === "video") {
			const video = document.createElement("video");
			video.muted = true; video.defaultMuted = true; video.playsInline = true; video.loop = true;
			video.preload = "auto"; video.tabIndex = -1; video.setAttribute("aria-hidden", "true");
			if (item.poster) video.poster = localizedMediaUrl(item.poster);
			for (const source of item.sources ?? []) {
				const node = document.createElement("source"); node.src = localizedMediaUrl(source.src); node.type = source.type; video.append(node);
			}
			try { await this.ready(video, "loadeddata"); return video; }
			catch {
				video.pause(); video.replaceChildren(); video.load();
				if (item.poster) return this.image(item.poster);
				throw new Error("Video unavailable");
			}
		}
		if (item.kind === "model") {
			try { modelModule ??= await import("./modelPreview"); return await modelModule.createModelPreview(item.src); }
			catch (error) { if (item.poster) return this.image(item.poster); throw error; }
		}
		return this.image(item.src);
	}
	async image(src: string) {
		const image = new Image(); image.alt = ""; image.decoding = "async";
		const loaded = this.ready(image, "load"); image.src = localizedMediaUrl(src); await loaded; return image;
	}
	ready(element: HTMLImageElement | HTMLVideoElement, event: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const finish = (error = false) => {
				clearTimeout(timeout); element.removeEventListener(event, success); element.removeEventListener("error", fail);
				error ? reject(new Error("Preview unavailable")) : resolve();
			};
			const success = () => finish(); const fail = () => finish(true);
			const timeout = setTimeout(fail, 12000);
			element.addEventListener(event, success, { once: true }); element.addEventListener("error", fail, { once: true });
		});
	}
}

if (!customElements.get("media-preview")) customElements.define("media-preview", MediaPreview);
