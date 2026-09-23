import { fetchJson } from "../http";
import { clamp, stripHtml } from "../rss";
import type { Source, SourceItem } from "../types";

const API = "https://hacker-news.firebaseio.com/v0";
/** Ignore low-signal stories so the model gets a clean list. */
const MIN_SCORE = 30;
/**
 * Keeps the number of subrequests low: Workers on the free plan allow 50 per invocation
 * and the summariser plus the GitHub commit need a few too.
 */
const MAX_CANDIDATES = 30;

interface HnItem {
	by?: string;
	descendants?: number;
	id: number;
	score?: number;
	text?: string;
	title?: string;
	type?: string;
	url?: string;
}

export const hackernews: Source = {
	id: "hackernews",
	group: "hn",
	names: { zh: "Hacker News", en: "Hacker News" },
	homepage: "https://news.ycombinator.com/",
	enabled: true,
	windowHours: 24,
	async fetch({ limit }) {
		const ids = await fetchJson<number[]>(`${API}/topstories.json`);
		const candidates = ids.slice(0, MAX_CANDIDATES);

		const stories = await Promise.all(
			candidates.map(async (id) => {
				try {
					return await fetchJson<HnItem | null>(`${API}/item/${id}.json`);
				} catch {
					return null;
				}
			}),
		);

		return stories
			.filter((story): story is HnItem => !!story && story.type === "story" && !!story.title)
			.filter((story) => (story.score ?? 0) >= MIN_SCORE)
			.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
			.slice(0, limit)
			.map((story): SourceItem => {
				const discussion = `https://news.ycombinator.com/item?id=${story.id}`;
				return {
					title: story.title ?? `HN #${story.id}`,
					url: story.url ?? discussion,
					meta: [
						`${story.score ?? 0} 分`,
						`${story.descendants ?? 0} 条评论`,
						story.by ? `by ${story.by}` : undefined,
						`HN 讨论 ${discussion}`,
					]
						.filter(Boolean)
						.join(" · "),
					detail: story.text ? clamp(stripHtml(story.text), 300) : undefined,
				};
			});
	},
};
