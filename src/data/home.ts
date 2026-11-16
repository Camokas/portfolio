// Тексты и настройки главной страницы. Меняйте значения в кавычках; разметку трогать не нужно.
// Каждый элемент aboutParagraphs — отдельный абзац описания (первый виден сразу, остальные раскрываются).
export const home = {
	pageTitle: "Camoka's Portfolio",
	pageDescription: "Camoka's multimedia portfolio featuring creative and development projects.",
	eyebrow: "Portfolio website",
	name: "Camoka",
	alias: "aka Daniil Doroshkin",
	heroLine: "I make games, 3D models, video, motion, music, and drawings. Everything is here, from first experiments to the latest builds.",
	/** Short «what I can make for you» row under the hero buttons: label, direction slug. */
	servicesLabel: "Open to projects in",
	services: [
		{ label: "Video editing", slug: "video-editing" },
		{ label: "3D models", slug: "3d-modeling" },
		{ label: "Motion design", slug: "motion-design" },
		{ label: "Game tools & shaders", slug: "game-development" },
	],
	heroArtCaption: "Drawn by me",
	aboutTitle: "About this portfolio",
	aboutParagraphs: [
		"My background spans game development, video editing, motion graphics, and 3D, with music and community projects along the way.",
		"I have been learning creative tools independently since I was young. Limited hardware taught me to simplify heavy projects and make the most of what I had. I enjoy refining motion and visual details and following an idea through to a finished result.",
	],
	viewWork: "View selected work",
	getInTouch: "Get in touch",
	featuredTitle: "Selected Work",
	allProjects: "All projects",
	/**
	 * Работы на главной подбираются автоматически (см. src/data/priority.mjs).
	 * Сюда можно вписать id проектов (папка/имя файла), которые нужно закрепить первыми, в нужном порядке.
	 * Остальные места заполняются автоматически. Пустой список = полностью автоматический выбор.
	 */
	pinnedProjects: [] as string[],
	highlightCount: 6,
	/** Сколько направлений показывать на главной (остальные — по ссылке «All directions»). */
	directionCount: 4,
	readMore: "Read more",
	showLess: "Show less",
	directionsTitle: "Creative Directions",
	allDirections: "All directions",
	softwareTitle: "Software I Use",
	fullToolkit: "Full toolkit",
	contactTitle: "Contact",
	contactDescription: "Questions, collaboration, or a project in mind? You can reach me by email or Telegram.",
};
