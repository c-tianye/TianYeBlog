import { fetchText } from "../http.ts";
import { parseFeed } from "../rss.ts";
import { daysAgo } from "../time.ts";
import type { Source, SourceItem } from "../types.ts";

/**
 * New AI papers from arXiv.
 *
 * The `export.arxiv.org/rss/cs.AI` feed is frequently empty (arXiv only fills it on its own
 * schedule), so this uses the query API, which is reliably populated and returns proper Atom.
 * Each query costs one subrequest; the `ai` group has room.
 */
const CATEGORIES = [
	{ label: "cs.AI", max: 8 },
	{ label: "cs.LG", max: 6 },
	{ label: "cs.CL", max: 5 },
];

const API = (category: string, max: number) =>
	`https://export.arxiv.org/api/query?search_query=cat:${category}` +
	`&sortBy=submittedDate&sortOrder=descending&max_results=${max}`;

/** Papers are posted on weekdays; a 4-day window keeps the 2-hourly group fed over a weekend. */
const LOOKBACK_DAYS = 4;

export const aiResearch: Source = {
	id: "ai-research",
	group: "ai",
	names: { zh: "arXiv AI 论文", en: "arXiv AI papers" },
	homepage: "https://arxiv.org/list/cs.AI/recent",
	enabled: true,
	windowHours: LOOKBACK_DAYS * 24,
	async fetch({ now, limit }) {
		const since = daysAgo(now, LOOKBACK_DAYS);
		const results = await Promise.allSettled(
			CATEGORIES.map(async (category) => ({
				category,
				xml: await fetchText(API(category.label, category.max)),
			})),
		);

		const seenUrls = new Set<string>();
		const dated: { at: number; item: SourceItem }[] = [];

		for (const result of results) {
			if (result.status !== "fulfilled") continue;
			const { category, xml } = result.value;

			for (const entry of parseFeed(xml, { summaryLimit: 420 })) {
				// cs.LG and cs.CL overlap with cs.AI; the same paper must not appear twice
				if (seenUrls.has(entry.link)) continue;
				if (entry.date && entry.date < since) continue;
				seenUrls.add(entry.link);

				dated.push({
					at: entry.date?.getTime() ?? 0,
					item: {
						title: entry.title,
						url: entry.link,
						meta: [
							`arXiv ${category.label}`,
							"新论文",
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
