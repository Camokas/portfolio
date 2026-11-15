import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { directions } from "../data/directions";
import { software, softwareUrl } from "../data/software";

const escapeXml = (value: string) =>
	value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export const GET: APIRoute = async ({ site }) => {
	const origin = site ?? new URL("https://camokas.github.io");
	const base = import.meta.env.BASE_URL;
	const absolute = (path: string) => new URL(path, origin).href;

	// Demo pages are marked noindex, so they stay out of the sitemap too.
	const projects = await getCollection("projects", ({ data }) => !data.draft && !data.demo);

	const entries: { loc: string; lastmod?: Date }[] = [
		{ loc: absolute(base) },
		{ loc: absolute(`${base}projects/`) },
		{ loc: absolute(`${base}directions/`) },
		...directions.map((direction) => ({ loc: absolute(`${base}directions/${direction.slug}/`) })),
		...software.map((tool) => ({ loc: absolute(softwareUrl(tool.slug, base)) })),
		...projects.map((project) => ({
			loc: absolute(`${base}projects/${project.id}/`),
			lastmod: project.data.dateEnd ?? project.data.date,
		})),
	];

	const body = entries
		.map(({ loc, lastmod }) =>
			`\t<url>\n\t\t<loc>${escapeXml(loc)}</loc>\n${
				lastmod ? `\t\t<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>\n` : ""
			}\t</url>`,
		)
		.join("\n");

	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
		{ headers: { "Content-Type": "application/xml; charset=utf-8" } },
	);
};
