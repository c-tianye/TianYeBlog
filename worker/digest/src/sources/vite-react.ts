import { fetchJson, fetchText, githubHeaders } from "../http";
import { clamp, parseFeed } from "../rss";
import { daysAgo, parseDate } from "../time";
import type { Source, SourceItem } from "../types";

const FEEDS = [
	{ label: "Vite", url: "https://vite.dev/blog.rss" },
	{ label: "React", url: "https://react.dev/rss.xml" },
];

/**
 * Repos whose releases are part of the "Vite / React stack" news stream.
 * Use the canonical names: GitHub 301s renamed repos (facebook/react -> react/react) and the
 * API then returns html_url with the new owner, which would disagree with a stale label here.
 */
const RELEASES = ["vitejs/vite", "react/react"];

/** Blog posts and releases are sparse, so look back further than the group cadence. */
const LOOKBACK_DAYS = 14;

interface GithubRelease {
	body?: string;
	draft?: boolean;
	html_url: string;
	name?: string;
	prerelease?: boolean;
	published_at?: string;
	tag_name: string;
}

export const viteReact: Source = {
	id: "vite-react",
	group: "daily",
	names: { zh: "Vite / React 技术栈", en: "Vite / React stack" },
	homepage: "https://vite.dev/blog",
	enabled: true,
	windowHours: LOOKBACK_DAYS * 24,
	async fetch({ env, now, limit }) {
		const since = daysAgo(now, LOOKBACK_DAYS);
		const items: SourceItem[] = [];
		const dated: { item: SourceItem; at: number }[] = [];
		const push = (item: SourceItem, date?: Date) => {
			items.push(item);
			dated.push({ item, at: date?.getTime() ?? 0 });
		};

		const feeds = await Promise.allSettled(
			FEEDS.map(async (feed) => ({ feed, xml: await fetchText(feed.url) })),
		);

		for (const result of feeds) {
			if (result.status !== "fulfilled") continue;
			const { feed, xml } = result.value;
			for (const entry of parseFeed(xml, { summaryLimit: 300 })) {
				if (entry.date && entry.date < since) continue;
				push(
					{
						title: `${feed.label}: ${entry.title}`,
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
					entry.date,
				);
			}
		}

		const releases = await Promise.allSettled(
			RELEASES.map(async (repo) => ({
				repo,
				releases: await fetchJson<GithubRelease[]>(
					`https://api.github.com/repos/${repo}/releases?per_page=5`,
					{ headers: githubHeaders(env.GITHUB_TOKEN) },
				),
			})),
		);

		for (const result of releases) {
			if (result.status !== "fulfilled") continue;
			for (const release of result.value.releases) {
				if (release.draft) continue;
				const published = parseDate(release.published_at);
				if (published && published < since) continue;
				push(
					{
						title: `${result.value.repo} ${release.tag_name}`,
						url: release.html_url,
						meta: [
							`${result.value.repo} release`,
							release.prerelease ? "预发布" : "正式版",
							published ? published.toISOString().slice(0, 10) : undefined,
						]
							.filter(Boolean)
							.join(" · "),
						detail: release.body ? clamp(release.body.replace(/\r/g, ""), 600) : undefined,
					},
					published,
				);
			}
		}

		return dated
			.sort((a, b) => b.at - a.at)
			.slice(0, limit)
			.map((entry) => entry.item);
	},
};
