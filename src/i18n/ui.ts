/**
 * Minimal i18n layer for the blog.
 *
 * The upstream theme (astro-theme-cactus) ships no locale support, so this module provides:
 * - a UI string dictionary per locale
 * - URL helpers for the `zh` (root, no prefix) / `en` (`/en/` prefix) routing scheme
 * - `htmlLang` / `ogLocale` mappings used by `<BaseHead>` and Pagefind's UI translations
 */

export const languages = {
	zh: "中文",
	en: "English",
} as const;

export type Lang = keyof typeof languages;

/** Chinese lives at the site root, English under `/en/`. */
export const defaultLang: Lang = "zh";

/** Value for the `<html lang>` attribute. Pagefind also reads this to translate its search UI. */
export const htmlLang: Record<Lang, string> = {
	zh: "zh-CN",
	en: "en-US",
};

export const ogLocale: Record<Lang, string> = {
	zh: "zh_CN",
	en: "en_US",
};

export interface Translations {
	"site.title": string;
	"site.description": string;

	"nav.home": string;
	"nav.about": string;
	"nav.posts": string;
	"nav.notes": string;

	"lang.other": string;
	"lang.ariaLabel": string;

	"common.skipToContent": string;
	"common.backToTop": string;
	"common.draft": string;
	"common.updated": string;
	"common.tableOfContents": string;
	"common.readingTime": (minutes: number) => string;
	"common.rssFeed": string;
	"common.socialLabel": string;
	"common.webmentions": string;
	"common.webmentionsPoweredBy": string;

	"home.heading": string;
	"home.pinnedPosts": string;

	"about.title": string;
	"about.description": string;
	"about.heading": string;

	"posts.title": string;
	"posts.description": string;
	"posts.pinnedPosts": string;
	"posts.postsIn": string;
	"posts.tags": string;
	"posts.viewAllTags": string;
	"posts.viewAllTagsSr": string;
	"posts.viewPostsWithTag": string;
	"posts.prev": string;
	"posts.next": string;

	"notes.title": string;
	"notes.description": string;
	"notes.prev": string;
	"notes.next": string;

	"tags.title": string;
	"tags.description": string;
	"tags.count": (count: number) => string;
	"tags.postsAbout": (tag: string) => string;
	"tags.viewPostsWithTag": string;
	"tags.prev": string;
	"tags.next": string;

	"404.title": string;
	"404.description": string;
	"404.heading": string;
	"404.text": string;
}

export const ui: Record<Lang, Translations> = {
	zh: {
		"site.title": "天业 Blog",
		"site.description":
			"c-tianye 的个人技术博客：量化交易与金融数据工具、PyTorch 时间序列建模，以及工程实践笔记。",

		"nav.home": "首页",
		"nav.about": "关于",
		"nav.posts": "文章",
		"nav.notes": "笔记",

		"lang.other": "EN",
		"lang.ariaLabel": "Switch to English",

		"common.skipToContent": "跳到正文",
		"common.backToTop": "回到顶部",
		"common.draft": "（草稿）",
		"common.updated": "更新于：",
		"common.tableOfContents": "目录",
		"common.readingTime": (minutes) => `约 ${minutes} 分钟`,
		"common.rssFeed": "RSS 订阅",
		"common.socialLabel": "找到我",
		"common.webmentions": "本文的 Webmentions",
		"common.webmentionsPoweredBy": "回复由 Webmentions 提供支持",

		"home.heading": "你好！",
		"home.pinnedPosts": "置顶文章",

		"about.title": "关于",
		"about.description": "关于 c-tianye 与这个博客",
		"about.heading": "关于",

		"posts.title": "文章",
		"posts.description": "这里是我写下的工程实践与排查记录",
		"posts.pinnedPosts": "置顶文章",
		"posts.postsIn": "文章年份",
		"posts.tags": "标签",
		"posts.viewAllTags": "查看全部",
		"posts.viewAllTagsSr": "博客标签",
		"posts.viewPostsWithTag": "查看带有该标签的文章",
		"posts.prev": "← 上一页",
		"posts.next": "下一页 →",

		"notes.title": "笔记",
		"notes.description": "这里是我的短笔记合集",
		"notes.prev": "← 上一页",
		"notes.next": "下一页 →",

		"tags.title": "标签",
		"tags.description": "我写过的全部主题",
		"tags.count": (count) => `${count} 篇文章`,
		"tags.postsAbout": (tag) => `关于「${tag}」的文章`,
		"tags.viewPostsWithTag": "查看带有该标签的文章",
		"tags.prev": "← 上一页",
		"tags.next": "下一页 →",

		"404.title": "404 | 页面不存在",
		"404.description": "这个页面好像不在这里",
		"404.heading": "404 | 页面不存在",
		"404.text": "请通过导航找到你要看的内容",
	},
	en: {
		"site.title": "TianYe Blog",
		"site.description":
			"c-tianye's personal engineering blog: quant trading and financial data tooling, time-series modelling in PyTorch, and engineering notes.",

		"nav.home": "Home",
		"nav.about": "About",
		"nav.posts": "Blog",
		"nav.notes": "Notes",

		"lang.other": "中文",
		"lang.ariaLabel": "切换到中文",

		"common.skipToContent": "skip to content",
		"common.backToTop": "Back to top",
		"common.draft": "(Draft)",
		"common.updated": "Updated:",
		"common.tableOfContents": "Table of Contents",
		"common.readingTime": (minutes) => `${minutes} min read`,
		"common.rssFeed": "RSS feed",
		"common.socialLabel": "Find me",
		"common.webmentions": "Webmentions for this post",
		"common.webmentionsPoweredBy": "Responses powered by Webmentions",

		"home.heading": "Hello World!",
		"home.pinnedPosts": "Pinned Posts",

		"about.title": "About",
		"about.description": "About c-tianye and this blog",
		"about.heading": "About",

		"posts.title": "Posts",
		"posts.description": "Engineering notes, decisions and debugging write-ups",
		"posts.pinnedPosts": "Pinned Posts",
		"posts.postsIn": "Posts in",
		"posts.tags": "Tags",
		"posts.viewAllTags": "View all",
		"posts.viewAllTagsSr": "blog tags",
		"posts.viewPostsWithTag": "View all posts with the tag",
		"posts.prev": "← Previous Page",
		"posts.next": "Next Page →",

		"notes.title": "Notes",
		"notes.description": "A collection of my short notes",
		"notes.prev": "← Previous Page",
		"notes.next": "Next Page →",

		"tags.title": "Tags",
		"tags.description": "A list of all the topics I've written about",
		"tags.count": (count) => `${count} Post${count > 1 ? "s" : ""}`,
		"tags.postsAbout": (tag) => `Posts about ${tag}`,
		"tags.viewPostsWithTag": "View posts with the tag",
		"tags.prev": "← Previous Page",
		"tags.next": "Next Page →",

		"404.title": "Oops! You found a missing page!",
		"404.description": "Oops! It looks like this page is lost in space!",
		"404.heading": "404 | Oops something went wrong",
		"404.text": "Please use the navigation to find your way back",
	},
};

/** Detect the locale of the current URL: `/en/...` is English, everything else is Chinese. */
export function getLangFromUrl(url: URL): Lang {
	return /^\/en(\/|$)/.test(url.pathname) ? "en" : defaultLang;
}

/** Remove the `/en` prefix from a pathname. */
export function stripLangFromPath(pathname: string): string {
	const stripped = pathname.replace(/^\/en(?=\/|$)/, "");
	return stripped === "" ? "/" : stripped;
}

/** Resolve a root-relative path (e.g. `/about/`) into the given locale. */
export function localizePath(path: string, lang: Lang): string {
	const clean = path.startsWith("/") ? path : `/${path}`;
	if (lang === defaultLang) return clean;
	return clean === "/" ? "/en/" : `/en${clean}`;
}

/** Path to the same page in the other locale, used by the language switcher. */
export function getAlternatePath(url: URL, override?: string): string {
	const path = override ?? stripLangFromPath(url.pathname);
	return localizePath(path, getLangFromUrl(url) === "en" ? defaultLang : "en");
}

export function useTranslations(lang: Lang) {
	return function t<Key extends keyof Translations>(key: Key): Translations[Key] {
		return ui[lang][key] ?? ui[defaultLang][key];
	};
}
