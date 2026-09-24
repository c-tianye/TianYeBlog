import { fetchResponse, fetchText } from "../http.ts";
import { clamp, parseFeed, stripHtml } from "../rss.ts";
import type { Source, SourceContext, SourceItem } from "../types.ts";

/**
 * Pi release notes.
 *
 * `https://pi.dev/changelog.xml` gives the list of versions (one RSS item per release, each
 * pointing at `https://pi.dev/changelog/releases/<version>`). The feed only carries the notes for
 * its newest entries in a usable form, so every version that has not been published yet is read
 * from its own release page — that page has the full section-by-section change list.
 */

const FEED = "https://pi.dev/changelog.xml";
/** Bound the number of release pages fetched per run (Workers subrequest budget). */
const MAX_VERSIONS_PER_RUN = 3;
/** Per-version budget for the text handed to the model. */
const MAX_DETAIL_CHARS = 4000;
const MAX_ITEM_CHARS = 400;

interface ReleaseSection {
	name: string;
	items: { links: string[]; text: string }[];
}

interface ReleaseDetail {
	date?: string | undefined;
	links: string[];
	sections: ReleaseSection[];
	/** Short blurb from the release page header ("New version of pi. …") */
	summary: string;
	title: string;
}

export const piChangelog: Source = {
	id: "pi-changelog",
	group: "pi",
	names: { zh: "Pi 版本更新", en: "Pi releases" },
	homepage: "https://pi.dev/changelog",
	enabled: true,
	windowHours: 24 * 14,
	async fetch({ seen, since }: SourceContext) {
		const entries = parseFeed(await fetchText(FEED), { summaryLimit: 600 })
			// newest first, as published in the feed
			.filter((entry) => !entry.date || entry.date >= since);

		// the orchestrator would de-duplicate later, but detail pages must not be fetched for
		// versions that were already published
		const pending = entries.filter((entry) => !seen.has(entry.link)).slice(0, MAX_VERSIONS_PER_RUN);

		const items: SourceItem[] = [];
		for (const entry of pending) {
			const version = entry.title.replace(/^Pi\s+/i, "");
			try {
				const detail = await parseReleasePage(entry.link);
				items.push(toItem(version, entry.link, detail, entry.summary, entry.date));
			} catch (error) {
				// a single unreadable release must not lose the whole run
				console.warn(`pi-changelog: ${entry.link} failed: ${(error as Error).message}`);
				items.push({
					detail: entry.summary,
					meta: [entry.date?.toISOString().slice(0, 10), "仅取到 RSS 摘要（详情页解析失败）"]
						.filter(Boolean)
						.join(" · "),
					title: entry.title,
					url: entry.link,
				});
			}
		}

		return items;
	},
};

function toItem(
	version: string,
	url: string,
	detail: ReleaseDetail,
	fallbackSummary: string | undefined,
	fallbackDate: Date | undefined,
): SourceItem {
	const date = detail.date ?? fallbackDate?.toISOString().slice(0, 10);
	const total = detail.sections.reduce((sum, section) => sum + section.items.length, 0);

	const body = detail.sections
		.map((section) => {
			const lines = section.items.map((item) => {
				const links = item.links.length > 0 ? ` （相关链接：${item.links.join(" ")}）` : "";
				return `- ${stripHtml(item.text)}${links}`;
			});
			return [`#### ${section.name}`, ...lines].join("\n");
		})
		.join("\n\n");

	const links = [
		...detail.links,
		...detail.sections.flatMap((section) => section.items.flatMap((item) => item.links)),
	];

	return {
		detail: clamp(
			[detail.summary, body].filter(Boolean).join("\n\n") || (fallbackSummary ?? ""),
			MAX_DETAIL_CHARS,
		),
		links: [...new Set(links)],
		meta: [
			date ? `发布于 ${date}` : undefined,
			detail.sections.length > 0 ? `${detail.sections.length} 个分类 / ${total} 条变更` : undefined,
			detail.links.length > 0 ? `原始链接 ${detail.links.join(" ")}` : undefined,
		]
			.filter(Boolean)
			.join(" · "),
		title: `Pi ${version}`,
		url,
	};
}

/** Reads one `https://pi.dev/changelog/releases/<version>` page. */
async function parseReleasePage(url: string): Promise<ReleaseDetail> {
	const response = await fetchResponse(url);

	const sections: ReleaseSection[] = [];
	const links: string[] = [];
	let title = "";
	let date: string | undefined;
	let summary = "";

	let heading = "";
	let headingBuf = "";
	let inHeading = false;
	let current: { links: string[]; text: string } | null = null;

	const commitItem = () => {
		if (!current) return;
		const text = current.text.replace(/\s+/g, " ").trim();
		if (text) {
			const name = heading || "Changes";
			let bucket = sections.find((section) => section.name === name);
			if (!bucket) {
				bucket = { items: [], name };
				sections.push(bucket);
			}
			bucket.items.push({ links: current.links, text: clamp(text, MAX_ITEM_CHARS) });
		}
		current = null;
	};

	await new HTMLRewriter()
		.on(".news-article-title", {
			text(chunk) {
				title += chunk.text;
			},
		})
		.on("time[datetime]", {
			element(time) {
				date = time.getAttribute("datetime")?.slice(0, 10) ?? undefined;
			},
		})
		.on(".news-prose h3", {
			element(element) {
				inHeading = true;
				headingBuf = "";
				element.onEndTag(() => {
					heading = headingBuf.replace(/\s+/g, " ").trim();
					inHeading = false;
				});
			},
			text(chunk) {
				if (inHeading) headingBuf += chunk.text;
			},
		})
		.on(".news-prose li", {
			element(element) {
				current = { links: [], text: "" };
				element.onEndTag(() => commitItem());
			},
			text(chunk) {
				if (current) current.text += chunk.text;
			},
		})
		.on(".news-prose li a", {
			element(anchor) {
				const href = anchor.getAttribute("href");
				if (!href || !current) return;
				const absolute = href.startsWith("http") ? href : new URL(href, url).href;
				if (!current.links.includes(absolute)) current.links.push(absolute);
			},
		})
		// the header blurb ("New version of pi. Download from npm …") plus its source links
		.on(".news-prose > p:first-child, .news-prose > p", {
			text(chunk) {
				if (!current) summary += chunk.text;
			},
		})
		.on(".news-release-links a", {
			element(anchor) {
				const href = anchor.getAttribute("href");
				if (href && !links.includes(href)) links.push(href);
			},
		})
		.transform(response)
		.text();

	return {
		date,
		links,
		sections,
		summary: clamp(summary.replace(/\s+/g, " ").trim(), MAX_ITEM_CHARS),
		title: title.trim() || url,
	};
}
