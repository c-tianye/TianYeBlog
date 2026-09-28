import { fetchText } from "../http.ts";
import { parseFeed } from "../rss.ts";
import { hoursAgo } from "../time.ts";
import type { Source, SourceItem } from "../types.ts";

/**
 * Macro / traditional finance news, paired with the crypto source in the hourly `crypto` group.
 *
 * Every feed below was picked because it is actually fresh: several well-known endpoints are
 * still served but frozen in time — `finance.yahoo.com/news/rssindex` lags ~4 days and
 * `feeds.a.dj.com/rss/RSSMarketsMain.xml` still returns January 2025 items — so they are
 * deliberately not used here.
 */
const FEEDS = [
	// market-focused, not the personal-finance advice columns in MarketWatch "topstories"
	{
		label: "MarketWatch 快讯",
		url: "https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines",
		per: 3,
	},
	{ label: "WSJ 市场", url: "https://feeds.content.dowjones.io/public/rss/RSSMarketsMain", per: 3 },
	{ label: "CNBC 市场", url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", per: 3 },
	{ label: "CNBC 财经", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", per: 2 },
	{ label: "BBC 商业", url: "https://feeds.bbci.co.uk/news/business/rss.xml", per: 2 },
	// Regulators publish only every few days but move markets when they do, so their newest item
	// is reserved a slot: sorting purely by date would let the hourly news flow crowd them out.
	{
		label: "美联储",
		url: "https://www.federalreserve.gov/feeds/press_all.xml",
		per: 1,
		pin: true,
	},
	{
		label: "SEC 公告",
		url: "https://www.sec.gov/news/pressreleases.rss",
		per: 1,
		pin: true,
	},
];

/**
 * Hourly group. Outlets publish continuously, but the Fed and SEC post only every few days, so the
 * window is wide enough (72h) that regulatory news is not silently filtered out between posts.
 */
const LOOKBACK_HOURS = 72;

export const finance: Source = {
	id: "finance",
	group: "crypto",
	names: { zh: "金融与宏观", en: "Finance & macro" },
	homepage: "https://finance.yahoo.com/",
	enabled: true,
	windowHours: LOOKBACK_HOURS,
	async fetch({ now, limit }) {
		const since = hoursAgo(now, LOOKBACK_HOURS);
		const results = await Promise.allSettled(
			FEEDS.map(async (feed) => ({ feed, xml: await fetchText(feed.url) })),
		);

		const dated: { at: number; item: SourceItem }[] = [];
		const pinned: { at: number; item: SourceItem }[] = [];

		for (const result of results) {
			if (result.status !== "fulfilled") continue;
			const { feed, xml } = result.value;
			const bucket = "pin" in feed && feed.pin ? pinned : dated;

			let taken = 0;
			for (const entry of parseFeed(xml, { summaryLimit: 300 })) {
				if (taken >= feed.per) break;
				if (entry.date && entry.date < since) continue;
				taken += 1;
				bucket.push({
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

		// newest first, with the reserved regulator slots guaranteed a place in the output
		const sorted = dated.sort((a, b) => b.at - a.at);
		const reserved = pinned
			.sort((a, b) => b.at - a.at)
			.slice(0, Math.max(1, Math.floor(limit / 6)));

		return [...reserved, ...sorted].slice(0, limit).map((entry) => entry.item);
	},
};
