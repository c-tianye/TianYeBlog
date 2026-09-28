import { fetchResponse, fetchText } from "../http.ts";
import { clamp, parseFeed, stripHtml } from "../rss.ts";
import { daysAgo } from "../time.ts";
import type { Source, SourceItem } from "../types.ts";

/**
 * First-party announcements from the major AI labs.
 *
 * Anthropic publishes no feed, so its news index is scraped with HTMLRewriter — the page is
 * server-rendered and its list markup (a[href^="/news/"] > time + title span) is stable.
 */
const FEEDS = [
	{ label: "OpenAI", url: "https://openai.com/news/rss.xml", per: 4 },
	{ label: "Google AI", url: "https://blog.google/technology/ai/rss/", per: 3 },
	{ label: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", per: 3 },
	{ label: "Hugging Face", url: "https://huggingface.co/blog/feed.xml", per: 4 },
];

const ANTHROPIC_NEWS_URL = "https://www.anthropic.com/news";
const ANTHROPIC_MAX = 4;

/** Labs post a few times a week, so look back far enough for a 2-hourly group to have material. */
const LOOKBACK_DAYS = 7;

export const aiLabs: Source = {
	id: "ai-labs",
	group: "ai",
	names: { zh: "AI 实验室官方动态", en: "AI labs" },
	homepage: "https://openai.com/news/",
	enabled: true,
	windowHours: LOOKBACK_DAYS * 24,
	async fetch({ now, limit }) {
		const since = daysAgo(now, LOOKBACK_DAYS);
		const results = await Promise.allSettled([
			...FEEDS.map(async (feed) => ({ feed, xml: await fetchText(feed.url) })),
			collectAnthropic(now),
		]);

		const dated: { at: number; item: SourceItem }[] = [];

		for (const result of results) {
			if (result.status !== "fulfilled") continue;

			// Anthropic already returns finished SourceItems
			if (!("feed" in result.value)) {
				for (const item of result.value.items) {
					dated.push({ at: result.value.at, item });
				}
				continue;
			}

			const { feed, xml } = result.value;
			let taken = 0;
			for (const entry of parseFeed(xml, { summaryLimit: 500 })) {
				if (taken >= feed.per) break;
				if (entry.date && entry.date < since) continue;
				taken += 1;
				dated.push({
					at: entry.date?.getTime() ?? 0,
					item: {
						title: entry.title,
						url: entry.link,
						meta: [
							feed.label,
							"官方博客",
							entry.date ? entry.date.toISOString().slice(0, 10) : undefined,
						]
							.filter(Boolean)
							.join(" · "),
						detail: entry.summary,
					},
				});
			}
		}

		return dated
			.sort((a, b) => b.at - a.at)
			.slice(0, limit)
			.map((entry) => entry.item);
	},
};

interface ScrapedList {
	at: number;
	items: SourceItem[];
}

/**
 * Reads https://www.anthropic.com/news and returns its article list.
 *
 * Markup shape (verified): each entry is
 * `<li><a href="/news/slug"><div class="…meta"><time>Sep 23, 2026</time>
 *  <span class="…subject">Science</span></div><span class="…title">Title</span></a></li>`
 *
 * The parser is deliberately tolerant: it collects per anchor, so a markup change degrades to
 * fewer items instead of throwing and losing the whole `ai` group.
 */
async function collectAnthropic(now: Date): Promise<ScrapedList> {
	const response = await fetchResponse(ANTHROPIC_NEWS_URL);
	const since = daysAgo(now, LOOKBACK_DAYS);
	const items: SourceItem[] = [];

	let active = false;
	// while inside the entry's <time>/subject span, text must not be appended to the title
	let inMeta = 0;
	let href: string | undefined;
	let date: string | undefined;
	let subject: string | undefined;
	let text = "";
	let newest = 0;

	await new HTMLRewriter()
		.on('a[href^="/news/"]', {
			element(anchor) {
				if (items.length >= ANTHROPIC_MAX) {
					anchor.remove();
					return;
				}
				const value = anchor.getAttribute("href");
				if (!value) return;

				active = true;
				inMeta = 0;
				href = `https://www.anthropic.com${value}`;
				date = undefined;
				subject = undefined;
				text = "";

				anchor.onEndTag(() => {
					const title = stripHtml(text);
					if (active && href && title && title.length > 4) {
						const parsed = date ? new Date(date) : undefined;
						const at = parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : 0;
						if (at === 0 || new Date(at) >= since) {
							newest = Math.max(newest, at);
							items.push({
								title: clamp(title, 160),
								url: href,
								meta: [
									"Anthropic",
									subject ? stripHtml(subject).trim() : undefined,
									parsed && !Number.isNaN(parsed.getTime())
										? parsed.toISOString().slice(0, 10)
										: undefined,
								]
									.filter(Boolean)
									.join(" · "),
							});
						}
					}
					active = false;
					inMeta = 0;
				});
			},
			text(chunk) {
				if (active && inMeta === 0) text += chunk.text;
			},
		})
		.on('a[href^="/news/"] time', {
			element(el) {
				if (!active) return;
				inMeta += 1;
				el.onEndTag(() => {
					inMeta -= 1;
				});
			},
			text(chunk) {
				if (active) date = `${date ?? ""}${chunk.text}`;
			},
		})
		.on('a[href^="/news/"] [class*="subject"]', {
			element(el) {
				if (!active) return;
				inMeta += 1;
				el.onEndTag(() => {
					inMeta -= 1;
				});
			},
			text(chunk) {
				if (active) subject = `${subject ?? ""}${chunk.text}`;
			},
		})
		.transform(response)
		.text();

	return { at: newest, items };
}
