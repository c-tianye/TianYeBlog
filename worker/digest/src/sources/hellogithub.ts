import { fetchText } from "../http.ts";
import { parseFeed } from "../rss.ts";
import { daysAgo } from "../time.ts";
import type { Source, SourceItem } from "../types.ts";

/** HelloGitHub publishes a monthly issue; the weekly group only posts when a new one lands. */
const LOOKBACK_DAYS = 60;

export const hellogithub: Source = {
	id: "hellogithub",
	group: "weekly",
	names: { zh: "HelloGitHub 月刊", en: "HelloGitHub" },
	homepage: "https://hellogithub.com/",
	enabled: true,
	windowHours: LOOKBACK_DAYS * 24,
	async fetch({ now, limit }) {
		const since = daysAgo(now, LOOKBACK_DAYS);
		const xml = await fetchText("https://hellogithub.com/rss");
		return parseFeed(xml, { summaryLimit: 900 })
			.filter((entry) => !entry.date || entry.date >= since)
			.slice(0, limit)
			.map(
				(entry): SourceItem => ({
					title: entry.title,
					url: entry.link,
					meta: ["HelloGitHub 月刊", entry.date?.toISOString().slice(0, 10)]
						.filter(Boolean)
						.join(" · "),
					detail: entry.summary,
				}),
			);
	},
};
