/**
 * Editorial priority: which projects and directions the site shows first.
 *
 * Everything here is plain arithmetic over project metadata — no hidden state, no
 * randomness. The same data always gives the same order. Edit `priorityConfig`
 * to tune it; every number is a "points" value, and the comments say what it does.
 *
 * PROJECT SCORE = pinned + featured + author priority + demonstration media + recency
 *
 *   pinned        frontmatter `pinned: true`          always first (ties: by score)
 *   featured      frontmatter `featured: true`        +featured points
 *   priority      frontmatter `priority: -5..10`      author's own weight, +10 points per step
 *   media         cover / video / 3D / audio / ...    each *kind* counts once, capped
 *   recency       newer work gets a little extra      fades linearly, deliberately small
 *
 * HIGHLIGHTS (home page) are picked greedily by score, but every pick lowers the
 * score of further projects from the same direction, and `perDirection` caps them,
 * so six strong 3D models cannot crowd out a video and a game.
 *
 * DIRECTION SCORE = a diminishing-returns sum of its projects' scores
 *   best project x1, second x0.6, third x0.36 ... (ratio `directionDecay`).
 * Ten tiny experiments therefore add little, while one strong project still counts.
 *
 * Drafts and demo content never take part (as in the rest of the site).
 */

export const priorityConfig = {
	pinned: 1000,
	featured: 40,
	priorityStep: 10,
	media: {
		cover: 6,
		gallery: 4, // needs at least `galleryMin` images
		galleryMin: 3,
		video: 10,
		model: 10,
		audio: 8,
		atlas: 6,
		shaderGraph: 3,
		code: 3,
		cap: 30,
	},
	recency: { max: 12, years: 5 },
	directionDecay: 0.6,
	highlights: { limit: 6, perDirection: 2, repeatPenalty: 25 },
};

const YEAR_MS = 365.25 * 24 * 3600 * 1000;

/** Public projects: not drafts, not demo content. */
export function isPublicProject(entry) {
	return !entry.data.draft && !entry.data.demo;
}

/** @returns {{total:number, parts:Record<string,number>}} */
export function scoreProject(entry, { now = Date.now(), config = priorityConfig } = {}) {
	const d = entry.data;
	const m = config.media;
	const media =
		Math.min(
			m.cap,
			(d.cover ? m.cover : 0) +
				((d.gallery?.length ?? 0) >= m.galleryMin ? m.gallery : 0) +
				(d.videos?.length ? m.video : 0) +
				(d.models?.length ? m.model : 0) +
				(d.audio?.length ? m.audio : 0) +
				(d.atlases?.length ? m.atlas : 0) +
				(d.shaderGraphs?.length ? m.shaderGraph : 0) +
				(d.codeSamples?.length ? m.code : 0),
		);
	const reference = (d.dateEnd ?? d.date).getTime();
	const age = Math.max(0, now - reference) / YEAR_MS;
	const recency = config.recency.max * Math.max(0, 1 - age / config.recency.years);
	const parts = {
		pinned: d.pinned ? config.pinned : 0,
		featured: d.featured ? config.featured : 0,
		priority: (d.priority ?? 0) * config.priorityStep,
		media,
		recency: Math.round(recency * 10) / 10,
	};
	const total = Object.values(parts).reduce((sum, value) => sum + value, 0);
	return { total, parts };
}

const byDateThenId = (a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id);

/** All public projects, best first. Deterministic for equal scores. */
export function rankProjects(entries, options = {}) {
	return entries
		.filter(isPublicProject)
		.map((entry) => ({ entry, score: scoreProject(entry, options).total }))
		.sort((a, b) => b.score - a.score || byDateThenId(a.entry, b.entry))
		.map(({ entry }) => entry);
}

/**
 * Home-page selection. `pinnedIds` (case-insensitive ids, in order) come first,
 * then the best remaining projects with direction variety.
 */
export function pickHighlights(entries, { pinnedIds = [], limit, now = Date.now(), config = priorityConfig } = {}) {
	const max = limit ?? config.highlights.limit;
	const pool = entries.filter(isPublicProject);
	const picked = [];
	for (const id of pinnedIds) {
		const found = pool.find((entry) => entry.id.toLowerCase() === id.toLowerCase());
		if (found && !picked.includes(found)) picked.push(found);
	}
	const scored = pool
		.filter((entry) => !picked.includes(entry))
		.map((entry) => ({ entry, score: scoreProject(entry, { now, config }).total }));
	// One card per "family" (misform, misform-models, ...): the first word of the file name.
	const familyOf = (entry) => entry.id.split("/").pop().toLowerCase().split("-")[0];
	const families = new Set(picked.map(familyOf));
	const perDirection = new Map();
	for (const entry of picked) perDirection.set(entry.data.direction, (perDirection.get(entry.data.direction) ?? 0) + 1);
	while (picked.length < max && scored.length) {
		let best = -1;
		let bestValue = -Infinity;
		scored.forEach(({ entry, score }, index) => {
			const used = perDirection.get(entry.data.direction) ?? 0;
			if (used >= config.highlights.perDirection) return;
			if (families.has(familyOf(entry))) return;
			const value = score - used * config.highlights.repeatPenalty;
			const better =
				value > bestValue ||
				(value === bestValue && best >= 0 && byDateThenId(entry, scored[best].entry) < 0);
			if (better) { best = index; bestValue = value; }
		});
		if (best < 0) break;
		const [{ entry }] = scored.splice(best, 1);
		picked.push(entry);
		families.add(familyOf(entry));
		perDirection.set(entry.data.direction, (perDirection.get(entry.data.direction) ?? 0) + 1);
	}
	return picked;
}

/**
 * Direction order for the home page and the directions index.
 * @param slugs     direction slugs in their default (declared) order — used as the tie-break
 * @returns         [{slug, score, count}] best first; empty directions go last in declared order
 */
export function rankDirections(entries, slugs, { now = Date.now(), config = priorityConfig } = {}) {
	const scores = new Map(slugs.map((slug) => [slug, []]));
	for (const entry of entries.filter(isPublicProject)) {
		scores.get(entry.data.direction)?.push(scoreProject(entry, { now, config }).total);
	}
	return slugs
		.map((slug, order) => {
			const list = scores.get(slug).sort((a, b) => b - a);
			const score = list.reduce((sum, value, index) => sum + Math.max(0, value) * config.directionDecay ** index, 0);
			return { slug, score: Math.round(score * 10) / 10, count: list.length, order };
		})
		.sort((a, b) => Number(b.count > 0) - Number(a.count > 0) || b.score - a.score || a.order - b.order)
		.map(({ order, ...rest }) => rest);
}
