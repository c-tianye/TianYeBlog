import { fetchText } from "../http.ts";
import { parseFeed } from "../rss.ts";
import { hoursAgo } from "../time.ts";
import type { Source, SourceItem } from "../types.ts";

/**
 * Crypto market news, several independent outlets merged into one source so the hourly
 * `crypto` group stays well below the Workers subrequest budget.
 *
 * All five feeds are plain RSS/Atom and were verified to return dated items without credentials.
 */
const FEEDS = [
	{ label: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml" },
	{ label: "Cointelegraph", url: "https://cointelegraph.com/rss" },
	{ label: "The Block", url: "https://www.theblock.co/rss.xml" },
	{ label: "Decrypt", url: "https://decrypt.co/feed" },
	{ label: "Blockworks", url: "https://blockworks.co/feed/" },
];

/** The group runs hourly; a 12h window keeps a quiet hour from producing an empty digest. */
const LOOKBACK_HOURS = 12;

export const cryptoNews: Source = {
	id: "crypto-news",
	group: "crypto",
	names: { zh: "加密货币资讯", en: "Crypto news" },
	homepage: "https://www.coindesk.com/",
	enabled: true,
	windowHours: LOOKBACK_HOURS,
	async fetch({ now, limit }) {
		const since = hoursAgo(now, LOOKBACK_HOURS);
		const results = await Promise.allSettled(
			FEEDS.map(async (feed) => ({ feed, xml: await fetchText(feed.url) })),
		);

		const dated: { at: number; item: SourceItem }[] = [];
		// Reserve a few slots so one chatty outlet cannot crowd out the rest.
		const perFeed = Math.max(2, Math.ceil(limit / FEEDS.length) + 1);

		for (const result of results) {
			if (result.status !== "fulfilled") continue;
			const { feed, xml } = result.value;

			let taken = 0;
			for (const entry of parseFeed(xml, { summaryLimit: 400 })) {
				if (taken >= perFeed) break;
				if (entry.date && entry.date < since) continue;
				taken += 1;
				dated.push({
					at: entry.date?.getTime() ?? 0,
					item: {
						title: entry.title,
						url: entry.link,
						meta: [
							feed.label,
							entry.date
								? `${entry.date.toISOString().slice(0, 16).replace("T", " ")} UTC`
								: undefined,
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
