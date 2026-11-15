// Registry of the author's hand-drawn sketches in public/decor/.
// To add a new drawing: put <name>.webp (light lines on a transparent background)
// into public/decor/ and add one line here with its pixel size. Then use
// <Doodle name="<name>" /> anywhere (next to headings, in margins, on project pages).
export const doodles = {
	author: { width: 720, height: 1028 },
	ducks: { width: 310, height: 360 },
	island: { width: 230, height: 280 },
	stars: { width: 400, height: 460 },
	workspace: { width: 335, height: 290 },
	"signature-line": { width: 430, height: 130 },
	"signature-stacked": { width: 225, height: 340 },
	"signature-tilted": { width: 400, height: 180 },
} as const;

export type DoodleName = keyof typeof doodles;

// Direction -> drawing used on its page header and empty-cover cards (optional, extendable).
export const directionDoodles: Partial<Record<string, DoodleName>> = {
	"game-development": "island",
	"3d-modeling": "workspace",
	"social-networks": "ducks",
	"video-editing": "stars",
};
