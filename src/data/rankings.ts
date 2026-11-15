import { getCollection, type CollectionEntry } from "astro:content";
import { directions, type DirectionSlug } from "./directions";
import { pickHighlights, rankDirections, rankProjects } from "./priority.mjs";
import { projectPreviews } from "./projectPreviews";

type Project = CollectionEntry<"projects">;

/** Non-draft projects (the catalog also lists demo content, the curated picks do not). */
export const listProjects = () => getCollection("projects", ({ data }) => !data.draft);

/** id -> editorial rank (0 = best). Unranked items (demo) sort last. */
export function rankMap(projects: Project[]): Map<string, number> {
	return new Map((rankProjects(projects) as Project[]).map((project, index) => [project.id, index]));
}

export const highlights = (projects: Project[], pinnedIds: string[], limit: number) =>
	pickHighlights(projects, { pinnedIds, limit }) as Project[];

/** Directions with at least one project, best first, plus empty ones after them. */
export function orderedDirections(projects: Project[]) {
	const ranking = rankDirections(projects, directions.map((direction) => direction.slug)) as {
		slug: DirectionSlug;
		score: number;
		count: number;
	}[];
	return ranking.map((item) => ({ ...item, direction: directions.find((direction) => direction.slug === item.slug)! }));
}

/** Up to `count` still-image URLs from a direction's best projects, for small static thumbnails. */
export async function directionThumbs(projects: Project[], slug: DirectionSlug, count = 3): Promise<string[]> {
	const best = (rankProjects(projects.filter((project) => project.data.direction === slug)) as Project[]);
	const urls: string[] = [];
	for (const project of best) {
		if (urls.length >= count) break;
		const first = (await projectPreviews(project)).find((item) => item.kind === "image" || (item.kind === "video" && item.poster));
		const url = first?.kind === "image" ? first.src : first?.poster;
		if (url && !urls.includes(url)) urls.push(url);
	}
	return urls;
}
