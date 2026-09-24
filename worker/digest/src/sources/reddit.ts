import { fetchJson, fetchText, USER_AGENT } from "../http.ts";
import { parseFeed } from "../rss.ts";
import { type Source, type SourceItem, SourceSkipped } from "../types.ts";

/**
 * Reddit blocks datacenter IPs on the JSON API and rate-limits the public `.rss` endpoints,
 * so this source has two modes:
 *
 * 1. **OAuth** (preferred) — set REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET from a "script" app at
 *    https://www.reddit.com/prefs/apps. Scores and comment counts come from the JSON API.
 * 2. **RSS fallback** — no credentials needed, titles only, and may report `skipped` when Reddit
 *    answers with 429/403 or a block page.
 */

interface RedditListing {
	data?: { children?: { data?: RedditPost }[] };
}

interface RedditPost {
	created_utc?: number;
	num_comments?: number;
	permalink?: string;
	stickied?: boolean;
	subreddit?: string;
	title?: string;
	ups?: number;
}

export const reddit: Source = {
	id: "reddit",
	group: "daily",
	names: { zh: "Reddit 科技热榜", en: "Reddit top tech" },
	homepage: "https://www.reddit.com/r/technology/top/?t=day",
	enabled: true,
	windowHours: 24,
	async fetch({ env, limit }) {
		const subs = (env.REDDIT_SUBS ?? "technology")
			.split(",")
			.map((sub) => sub.trim().replace(/^r\//, ""))
			.filter(Boolean);

		const perSub = Math.max(1, Math.ceil(limit / Math.max(1, subs.length)));
		const token = await getToken(env);
		const items: SourceItem[] = [];

		for (const sub of subs) {
			items.push(
				...(token ? await fetchViaApi(sub, perSub, token) : await fetchViaRss(sub, perSub)),
			);
		}

		return items.slice(0, limit);
	},
};

async function getToken(env: {
	REDDIT_CLIENT_ID?: string;
	REDDIT_CLIENT_SECRET?: string;
}): Promise<string | undefined> {
	if (!env.REDDIT_CLIENT_ID || !env.REDDIT_CLIENT_SECRET) return undefined;

	const response = await fetch("https://www.reddit.com/api/v1/access_token", {
		body: "grant_type=client_credentials",
		headers: {
			authorization: `Basic ${btoa(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`)}`,
			"content-type": "application/x-www-form-urlencoded",
			"user-agent": USER_AGENT,
		},
		method: "POST",
	});

	if (!response.ok) {
		throw new SourceSkipped(`Reddit OAuth 失败：HTTP ${response.status}`);
	}
	const payload = (await response.json()) as { access_token?: string };
	if (!payload.access_token) throw new SourceSkipped("Reddit OAuth 未返回 token");
	return payload.access_token;
}

async function fetchViaApi(sub: string, limit: number, token: string): Promise<SourceItem[]> {
	const listing = await fetchJson<RedditListing>(
		`https://oauth.reddit.com/r/${sub}/top?t=day&limit=${limit}&raw_json=1`,
		{ headers: { authorization: `bearer ${token}` } },
	);

	return (listing.data?.children ?? [])
		.map((child) => child.data)
		.filter((post): post is RedditPost => Boolean(post?.title && post.permalink))
		.filter((post) => !post.stickied)
		.map((post) => ({
			title: post.title ?? "",
			url: `https://www.reddit.com${post.permalink}`,
			meta: [
				`r/${post.subreddit ?? sub}`,
				"今日 top",
				typeof post.ups === "number" ? `${post.ups} 赞` : undefined,
				typeof post.num_comments === "number" ? `${post.num_comments} 评论` : undefined,
			]
				.filter(Boolean)
				.join(" · "),
		}));
}

async function fetchViaRss(sub: string, limit: number): Promise<SourceItem[]> {
	const url = `https://www.reddit.com/r/${sub}/top/.rss?t=day`;
	let xml: string;
	try {
		xml = await fetchText(url, {
			headers: { accept: "application/atom+xml, application/rss+xml, application/xml" },
			userAgent: `Mozilla/5.0 (compatible; ${USER_AGENT})`,
		});
	} catch (error) {
		throw new SourceSkipped(
			`r/${sub} 不可用（${(error as Error).message}），配置 REDDIT_CLIENT_ID/SECRET 可走官方 API`,
		);
	}

	const entries = parseFeed(xml, { summaryLimit: 120 }).slice(0, limit);
	if (entries.length === 0) {
		// Reddit answers 200 with a block/consent page for some IP ranges.
		throw new SourceSkipped(
			`r/${sub} RSS 返回 0 条（${xml.length} 字节，可能被限流或拦截），配置 REDDIT_CLIENT_ID/SECRET 可走官方 API`,
		);
	}

	return entries.map((entry) => ({
		title: entry.title,
		url: entry.link,
		meta: [`r/${sub}`, "今日 top", entry.date?.toISOString().slice(0, 16).replace("T", " ")]
			.filter(Boolean)
			.join(" · "),
	}));
}
