import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { TextureLoader } from "three";

// One place that creates GLTF loaders for every 3D view on the site.
// Firefox: embedded GLB textures are decoded through the plain <img> path (blob: URLs, allowed by the CSP)
// instead of fetch + createImageBitmap, which is the less reliable route there.
const firefox = typeof navigator !== "undefined" && /firefox\//i.test(navigator.userAgent);

export function createGltfLoader(): GLTFLoader {
	const loader = new GLTFLoader();
	if (firefox) {
		loader.register((parser) => {
			(parser as unknown as { textureLoader: unknown }).textureLoader = new TextureLoader(parser.options.manager);
			return { name: "PortfolioFirefoxTextures" };
		});
	}
	return loader;
}

/** Creates a WebGL2 context, relaxing attributes step by step. Returns null if the browser refuses all of them. */
export function createWebGL2Context(canvas: HTMLCanvasElement, wanted: WebGLContextAttributes = {}): WebGL2RenderingContext | null {
	const attempts: WebGLContextAttributes[] = [
		wanted,
		{ ...wanted, antialias: false },
		{ alpha: true, antialias: false, depth: true, powerPreference: "default", failIfMajorPerformanceCaveat: false },
	];
	for (const attributes of attempts) {
		try {
			const context = canvas.getContext("webgl2", attributes);
			if (context) return context;
		} catch { /* try the next set */ }
	}
	return null;
}
