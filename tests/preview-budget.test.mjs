import test from "node:test";
import assert from "node:assert/strict";
import { createPreviewBudget, heavyLimit } from "../src/scripts/previewBudget.mjs";

test("heavy limit is conservative on touch, weak CPUs and reduced motion", () => {
	assert.equal(heavyLimit({ cores: 8 }), 4);
	assert.equal(heavyLimit({ cores: 4 }), 2);
	assert.equal(heavyLimit({ coarsePointer: true, cores: 12 }), 2);
	assert.equal(heavyLimit({ reducedMotion: true }), 1);
	assert.equal(heavyLimit({ saveData: true }), 1);
});

test("budget never grants more slots than the limit", () => {
	const budget = createPreviewBudget(2);
	const [a, b, c] = [{}, {}, {}];
	assert.ok(budget.tryAcquire(a));
	assert.ok(budget.tryAcquire(b));
	assert.equal(budget.tryAcquire(c), false);
	assert.ok(budget.tryAcquire(a), "an owner keeps its slot");
	budget.release(a);
	assert.ok(budget.tryAcquire(c));
	assert.equal(budget.size, 2);
});

test("a prioritised owner preempts the oldest holder, which is told to yield", () => {
	const budget = createPreviewBudget(1);
	let yielded = false;
	const old = { yieldHeavy() { yielded = true; } };
	const hovered = {};
	assert.ok(budget.tryAcquire(old));
	assert.equal(budget.tryAcquire(hovered), false);
	assert.ok(budget.tryAcquire(hovered, { priority: true }));
	assert.equal(yielded, true);
	assert.equal(budget.holds(old), false);
	assert.equal(budget.size, 1);
});

test("a zero limit grants nothing, even to prioritised owners", () => {
	const budget = createPreviewBudget(0);
	assert.equal(budget.tryAcquire({}, { priority: true }), false);
});
