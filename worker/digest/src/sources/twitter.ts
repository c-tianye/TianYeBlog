import { type Source, SourceSkipped } from "../types.ts";

/**
 * 推特热榜 (X/Twitter trending) is intentionally not enabled.
 *
 * The trends endpoint (`GET /2/trends/by/woeid/:woeid`) is not part of the free X API tier —
 * it needs at least the Basic plan. The scraper route (trends24.in and friends) was rejected
 * as a default because it breaks whenever the markup changes and is not an official interface.
 *
 * To turn it on:
 *   1. add an X API bearer token:   npx wrangler secret put X_BEARER_TOKEN
 *   2. set `enabled: true` below
 *   3. replace `fetch()` with:
 *
 *      const response = await fetchJson<{ data?: { trend_name: string; tweet_volume?: number }[] }>(
 *        `https://api.x.com/2/trends/by/woeid/${woeid}?max_trends=20`,
 *        { headers: { authorization: `Bearer ${env.X_BEARER_TOKEN}` } },
 *      );
 *
 *      woeid 23424781 = China, 1 = worldwide — make it a var instead of hardcoding it.
 */
export const twitter: Source = {
	id: "twitter",
	group: "daily",
	names: { zh: "推特热榜", en: "X/Twitter trends" },
	homepage: "https://x.com/explore/tabs/trending",
	enabled: false,
	disabledReason: "X/Twitter trends need a paid API tier (see sources/twitter.ts)",
	windowHours: 24,
	async fetch() {
		throw new SourceSkipped("X/Twitter trends require a paid API tier");
	},
};
