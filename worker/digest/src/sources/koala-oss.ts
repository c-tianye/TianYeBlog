import { fetchText } from "../http.ts";
import { parseFeed } from "../rss.ts";
import { daysAgo } from "../time.ts";
import type { Source, SourceItem } from "../types.ts";

/** Koala 聊开源 posts videos and picks roughly weekly. */
const LOOKBACK_DAYS = 30;

export const koalaOss: Source = {
	id: "koala-oss",
	group: "weekly",
	names: { zh: "Koala 聊开源", en: "Koala 聊开源" },
	homepage: "https://koala-oss.app/",
	enabled: true,
	windowHours: LOOKBACK_DAYS * 24,
	async fetch({ now, limit }) {
		const since = daysAgo(now, LOOKBACK_DAYS);
		const xml = await fetchText("https://koala-oss.app/rss.xml");
		return parseFeed(xml, { summaryLimit: 400 })
			.filter((entry) => !entry.date || entry.date >= since)
			.slice(0, limit)
			.map(
				(entry): SourceItem => ({
					title: entry.title,
					url: entry.link,
					meta: ["Koala 聊开源 视频/推荐", entry.date?.toISOString().slice(0, 10)]
						.filter(Boolean)
						.join(" · "),
					detail: entry.summary,
				}),
			);
	},
};
