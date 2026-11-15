import test from "node:test";
import assert from "node:assert/strict";
import { pickHighlights, rankDirections, rankProjects, scoreProject } from "../src/data/priority.mjs";

const NOW = Date.UTC(2026, 10, 1);
const make = (id, direction, extra = {}) => ({
	id,
	data: {
		direction,
		date: new Date(Date.UTC(2025, 0, 1)),
		featured: false,
		draft: false,
		demo: false,
		gallery: [],
		videos: [],
		models: [],
		audio: [],
		atlases: [],
		shaderGraphs: [],
		codeSamples: [],
		...extra,
	},
});

test("drafts and demo content never take part", () => {
	const items = [make("a", "x"), make("b", "x", { draft: true }), make("c", "x", { demo: true })];
	assert.deepEqual(rankProjects(items, { now: NOW }).map((e) => e.id), ["a"]);
	assert.deepEqual(pickHighlights(items, { now: NOW }).map((e) => e.id), ["a"]);
});

test("pinned beats everything, author priority and featured add up", () => {
	const items = [
		make("plain", "x", { videos: [1] }),
		make("featured", "x", { featured: true }),
		make("weighted", "x", { priority: 8 }),
		make("pinned", "x", { pinned: true }),
	];
	assert.equal(rankProjects(items, { now: NOW })[0].id, "pinned");
	assert.ok(scoreProject(items[2], { now: NOW }).total > scoreProject(items[1], { now: NOW }).total);
});

test("equal data gives an equal, stable order", () => {
	const items = ["b", "a", "c"].map((id) => make(id, "x"));
	const first = rankProjects(items, { now: NOW }).map((e) => e.id);
	const second = rankProjects([...items].reverse(), { now: NOW }).map((e) => e.id);
	assert.deepEqual(first, second);
});

test("highlights keep manual pins first and stay varied", () => {
	const items = [
		...["m1", "m2", "m3", "m4"].map((id) => make(id, "3d", { featured: true, videos: [1] })),
		make("g1", "game", { featured: true }),
		make("v1", "video", { featured: true }),
	];
	const picks = pickHighlights(items, { pinnedIds: ["V1"], limit: 4, now: NOW }).map((e) => e.id);
	assert.equal(picks[0], "v1");
	assert.equal(picks.filter((id) => id.startsWith("m")).length, 2, "at most two from one direction");
	assert.ok(picks.includes("g1"));
});

test("many small experiments do not outweigh one strong direction", () => {
	const small = Array.from({ length: 12 }, (_, i) => make(`s${i}`, "shading"));
	const strong = [make("big", "games", { featured: true, priority: 8, videos: [1] })];
	const ranked = rankDirections([...small, ...strong], ["shading", "games", "empty"], { now: NOW });
	assert.deepEqual(ranked.map((d) => d.slug), ["games", "shading", "empty"]);
});

test("empty directions go last in declared order", () => {
	const ranked = rankDirections([make("a", "b")], ["a", "b", "c"], { now: NOW });
	assert.deepEqual(ranked.map((d) => d.slug), ["b", "a", "c"]);
});
