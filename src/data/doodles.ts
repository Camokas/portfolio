// Registry of the author's hand-drawn sketches in public/decor/.
// To add a new drawing: put <name>.webp (light lines on a transparent background)
// into public/decor/ and add one line here with its pixel size. Then use
// <Doodle name="<name>" /> anywhere (next to headings, in margins, on project pages).
export const doodles = {
	// Characters and scenes
	author: { width: 720, height: 1028 },
	ducks: { width: 310, height: 360 },
	island: { width: 230, height: 280 },
	stars: { width: 400, height: 460 },
	workspace: { width: 335, height: 290 },
	"signature-line": { width: 430, height: 130 },
	"signature-stacked": { width: 225, height: 340 },
	"signature-tilted": { width: 400, height: 180 },
	// One sketch per direction
	cube: { width: 291, height: 297 },
	curve: { width: 329, height: 224 },
	film: { width: 324, height: 216 },
	headphones: { width: 289, height: 291 },
	"material-sphere": { width: 288, height: 291 },
	"message-cloud": { width: 291, height: 247 },
	monitor: { width: 296, height: 274 },
	pencil: { width: 246, height: 317 },
	"walking-person": { width: 200, height: 312 },
	// Margin notes
	"arrow-right": { width: 152, height: 77 },
	"arrow-left": { width: 161, height: 59 },
	"arrow-up": { width: 67, height: 133 },
	"scribble-line": { width: 305, height: 23 },
	"star-sketch": { width: 124, height: 100 },
	star: { width: 165, height: 135 },
	cursor: { width: 84, height: 74 },
	hi: { width: 130, height: 125 },
	"spiral-1": { width: 175, height: 141 },
	"spiral-2": { width: 135, height: 115 },
	"cross-1": { width: 115, height: 95 },
	"cross-2": { width: 109, height: 110 },
	"zzz-small": { width: 125, height: 80 },
	zzz: { width: 157, height: 133 },
	"the-end": { width: 303, height: 140 },
	"corner-1": { width: 70, height: 79 },
	"corner-2": { width: 75, height: 80 },
	dots: { width: 140, height: 115 },
	binary: { width: 168, height: 167 },
} as const;

export type DoodleName = keyof typeof doodles;

// Direction -> its own sketch (page headers, direction tiles, covers-less cards).
// "game-development" has no joystick yet, so it borrows the island until one is added.
export const directionDoodles: Record<string, DoodleName> = {
	"game-development": "island",
	"3d-modeling": "cube",
	"music-sound": "headphones",
	drawing: "pencil",
	"video-editing": "film",
	"motion-design": "curve",
	animation: "walking-person",
	shading: "material-sphere",
	"social-networks": "message-cloud",
	software: "monitor",
};
