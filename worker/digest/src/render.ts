import { groupConfig } from "./groups.ts";
import { cstCompactDate, cstCompactStamp, cstDate, cstDateTime, cstIso, isoWeek } from "./time.ts";
import type { Group, Source, SourceItem } from "./types.ts";

export interface RenderedFile {
	path: string;
	content: string;
}

export interface RenderedPost {
	slug: string;
	/** Site path, e.g. /posts/digest-daily-20260923/ */
	path: string;
	files: RenderedFile[];
	title: { zh: string; en: string };
}

export interface PostInput {
	group: Group;
	now: Date;
	summary: { zh: { description: string; body: string }; en: { description: string; body: string } };
	sources: { source: Source; items: SourceItem[] }[];
	siteUrl: string;
}

const MAX_TITLE = 60;

/**
 * File-system safe slug, shared by both locales so the language switcher lines up.
 * Every group needs its own prefix — two groups writing the same path would silently overwrite
 * each other's post (and the existence check would then skip the second one).
 */
export function slugFor(group: Group, now: Date): string {
	switch (group) {
		case "hn":
			return `digest-hn-${cstCompactStamp(now)}`;
		case "pi":
			return `digest-pi-${cstCompactStamp(now)}`;
		case "weekly":
			return `digest-weekly-${isoWeek(now).toLowerCase()}`;
		case "daily":
			return `digest-daily-${cstCompactDate(now)}`;
	}
}

function labelFor(group: Group, now: Date): string {
	switch (group) {
		case "hn":
		case "pi":
			return cstDateTime(now);
		case "weekly":
			return isoWeek(now);
		case "daily":
			return cstDate(now);
	}
}

function titleFor(group: Group, now: Date, lang: "zh" | "en"): string {
	const config = groupConfig(group);
	return `${config.title[lang]} ${labelFor(group, now)}`.slice(0, MAX_TITLE);
}

/** JSON string escaping is a valid YAML double-quoted scalar — safest way to inject text. */
const yaml = (value: string) => JSON.stringify(value);

export function buildPost(input: PostInput): RenderedPost {
	const { group, now, summary, sources, siteUrl } = input;
	const config = groupConfig(group);
	const slug = slugFor(group, now);
	const footerZh = buildFooter(sources, now, siteUrl, "zh", slug);
	const footerEn = buildFooter(sources, now, siteUrl, "en", slug);

	const files: RenderedFile[] = [
		{
			content: buildFile({
				body: `${summary.zh.body.trim()}\n\n${footerZh}`,
				date: cstIso(now),
				description: summary.zh.description,
				tags: config.tags.zh,
				title: titleFor(group, now, "zh"),
			}),
			path: `content/posts/${slug}.md`,
		},
		{
			content: buildFile({
				body: `${summary.en.body.trim()}\n\n${footerEn}`,
				date: cstIso(now),
				description: summary.en.description,
				tags: config.tags.en,
				title: titleFor(group, now, "en"),
			}),
			path: `content/en/posts/${slug}.md`,
		},
	];

	return {
		files,
		path: `/posts/${slug}/`,
		slug,
		title: { en: titleFor(group, now, "en"), zh: titleFor(group, now, "zh") },
	};
}

/** Used when Gemini is unavailable and DIGEST_RAW_FALLBACK=true. */
export function buildRawSummary(input: {
	group: Group;
	now: Date;
	sources: { source: Source; items: SourceItem[] }[];
}): { zh: { description: string; body: string }; en: { description: string; body: string } } {
	const total = input.sources.reduce((sum, entry) => sum + entry.items.length, 0);
	const names = input.sources.map((entry) => entry.source.names.zh).join("、");
	const namesEn = input.sources.map((entry) => entry.source.names.en).join(", ");

	const render = (lang: "zh" | "en") => {
		const sections = input.sources.map(({ source, items }) => {
			const heading = `## ${source.names[lang]}`;
			const lines = items.map((item) => {
				const meta = item.meta ? ` — ${item.meta}` : "";
				return `- [${item.title}](${item.url})${meta}`;
			});
			return [heading, "", ...lines].join("\n");
		});
		const intro =
			lang === "zh"
				? `> 本期由自动抓取生成（未经过 AI 汇总）。共 ${total} 条，来自 ${names}。`
				: `> Automatically collected, no AI summary (${total} items from ${namesEn}).`;
		return [intro, "", ...sections].join("\n\n");
	};

	return {
		en: {
			body: render("en"),
			description: `${total} new items from ${namesEn}`,
		},
		zh: {
			body: render("zh"),
			description: `本期收录 ${total} 条，来自 ${names}`,
		},
	};
}

interface FileFields {
	title: string;
	description: string;
	date: string;
	tags: string[];
	body: string;
}

function buildFile({ title, description, date, tags, body }: FileFields): string {
	const frontmatter = [
		"---",
		`title: ${yaml(title)}`,
		`description: ${yaml(description)}`,
		`publishDate: ${yaml(date)}`,
		`tags: ${JSON.stringify(tags)}`,
		"draft: false",
		"---",
	].join("\n");

	return `${frontmatter}\n\n${body.trim()}\n`;
}

function buildFooter(
	sources: { source: Source; items: SourceItem[] }[],
	now: Date,
	siteUrl: string,
	lang: "zh" | "en",
	slug: string,
): string {
	const total = sources.reduce((sum, entry) => sum + entry.items.length, 0);
	const list = sources
		.map(({ source, items }) => `[${source.names[lang]}](${source.homepage})（${items.length}）`)
		.join(" · ");
	const base = siteUrl.replace(/\/$/, "");
	const postPath = `/posts/${slug}/`;

	if (lang === "en") {
		return [
			"---",
			"",
			`**Sources** (${total} items): ${list}`,
			"",
			`Collected ${cstDateTime(now)} CST by a Cloudflare Worker, summarised by Gemini.`,
			`Machine-generated digest — the [Chinese version](${base}${postPath}) may read better.`,
		].join("\n");
	}

	return [
		"---",
		"",
		`**本期来源**（共 ${total} 条）：${list}`,
		"",
		`抓取时间：${cstDateTime(now)}（CST），由 Cloudflare Worker 定时抓取、Gemini 汇总生成。`,
		`英文版见 [English version](${base}/en${postPath})。`,
	].join("\n");
}
