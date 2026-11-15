// Shared budget for "heavy" card previews (video decoding and WebGL models).
// Images and code slides are cheap and stay unrestricted; only a few heavy
// slides may run at once across the whole page. No new media files are needed.

export function heavyLimit({ reducedMotion = false, saveData = false, coarsePointer = false, cores = 8 } = {}) {
	if (reducedMotion || saveData) return 1;
	return coarsePointer || cores <= 4 ? 2 : 4;
}

export function createPreviewBudget(limit) {
	const holders = new Map(); // owner -> acquisition order
	let counter = 0;
	return {
		get limit() { return limit; },
		setLimit(value) { limit = value; },
		holds(owner) { return holders.has(owner); },
		get size() { return holders.size; },
		// An owner under pointer/focus (`priority`) may take the oldest slot.
		tryAcquire(owner, { priority = false } = {}) {
			if (holders.has(owner)) return true;
			if (limit <= 0) return false;
			if (holders.size < limit) { holders.set(owner, ++counter); return true; }
			if (!priority) return false;
			let oldest;
			for (const [candidate, order] of holders) {
				if (!oldest || order < oldest.order) oldest = { candidate, order };
			}
			// Hand the slot over first, so the evicted owner cannot take it back while yielding.
			holders.delete(oldest.candidate);
			holders.set(owner, ++counter);
			oldest.candidate.yieldHeavy?.();
			return true;
		},
		release(owner) { holders.delete(owner); },
	};
}
