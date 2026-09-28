import { fetchText } from "../http.ts";
import { parseFeed } from "../rss.ts";
import { daysAgo } from "../time.ts";
import type { Source, SourceItem } from "../types.ts";

/** Engineering-focused outlets: community links, long-form write-ups, infrastructure news. */
const FEEDS = [
	{ label: "Lobsters", url: "https://lobste.rs/rss", per: 6 },
	{ label: "InfoQ", url: "https://www.infoq.com/feed/", per: 4 },
	{ label: "Cloudflare 博客", url: "https://blog.cloudflare.com/rss/", per: 4 },
];

const LOOKBACK_DAYS = 2;

export const techMedia: Source = {
	id: "tech-media",
	group: "daily",
	names: { zh: "工程与技术社区", en: "Engineering & tech community" },
	homepage: "https://lobste.rs/",
	enabled: true,
	windowHours: LOOKBACK_DAYS * 24,
	async fetch({ now, limit }) {
		const since = daysAgo(now, LOOKBACK_DAYS);
		const results = await Promise.allSettled(
			FEEDS.map(async (feed) => ({ feed, xml: await fetchText(feed.url) })),
		);

		const dated: { at: number; item: SourceItem }[] = [];

		for (const result of results) {
			if (result.status !== "fulfilled") continue;
			const { feed, xml } = result.value;

			let taken = 0;
			for (const entry of parseFeed(xml, { summaryLimit: 350 })) {
				if (taken >= feed.per) break;
				if (entry.date && entry.date < since) continue;
				taken += 1;
				dated.push({
					at: entry.date?.getTime() ?? 0,
					item: {
						title: entry.title,
						url: entry.link,
						meta: [feed.label, entry.date ? entry.date.toISOString().slice(0, 10) : undefined]
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
