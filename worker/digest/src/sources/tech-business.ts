import { fetchText } from "../http.ts";
import { parseFeed } from "../rss.ts";
import { daysAgo } from "../time.ts";
import type { Source, SourceItem } from "../types.ts";

/** Industry / business coverage: funding, product launches, policy and platform news. */
const FEEDS = [
	{ label: "TechCrunch", url: "https://techcrunch.com/feed/", per: 6 },
	{ label: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", per: 5 },
	{ label: "The Verge", url: "https://www.theverge.com/rss/index.xml", per: 4 },
];

const LOOKBACK_DAYS = 2;

export const techBusiness: Source = {
	id: "tech-business",
	group: "daily",
	names: { zh: "科技商业动态", en: "Tech business" },
	homepage: "https://techcrunch.com/",
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
