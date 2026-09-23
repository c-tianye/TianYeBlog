import { fetchJson, fetchResponse } from "../http";
import { clamp } from "../rss";
import type { Source, SourceItem } from "../types";

const TRENDING_URL = "https://github.com/trending?since=daily";

interface SearchRepo {
	description?: string | null;
	full_name: string;
	html_url: string;
	language?: string | null;
	stargazers_count?: number;
}

/**
 * GitHub has no official trending API, so this parses the public trending page with
 * HTMLRewriter and falls back to the search API (new repos by stars) if the markup changes.
 */
export const githubTrending: Source = {
	id: "github-trending",
	group: "daily",
	names: { zh: "GitHub 热榜", en: "GitHub Trending" },
	homepage: "https://github.com/trending",
	enabled: true,
	windowHours: 24,
	async fetch({ env, limit }) {
		const parsed = await parseTrendingPage(limit).catch((error: unknown) => {
			console.warn(`github-trending: page parse failed (${(error as Error).message})`);
			return [] as SourceItem[];
		});
		if (parsed.length >= 3) return parsed;

		console.warn(`github-trending: falling back to the search API (only ${parsed.length} parsed)`);
		const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
		const search = await fetchJson<{ items?: SearchRepo[] }>(
			`https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=${limit}`,
			{
				headers: {
					accept: "application/vnd.github+json",
					authorization: env.GITHUB_TOKEN ? `Bearer ${env.GITHUB_TOKEN}` : "",
				},
			},
		);
		return (search.items ?? []).map((repository) => ({
			title: repository.full_name,
			url: repository.html_url,
			meta: [
				"新建 3 天内",
				typeof repository.stargazers_count === "number"
					? `${repository.stargazers_count} stars`
					: undefined,
				repository.language ?? undefined,
			]
				.filter(Boolean)
				.join(" · "),
			detail: repository.description ?? undefined,
		}));
	},
};

/**
 * The trending page is a flat list of `article.Box-row` blocks. Nested `element.on()` handlers
 * are not in the public type definitions, so each field is matched with its own descendant
 * selector and the values are flushed on the article's end tag (handlers fire in document order).
 */
async function parseTrendingPage(limit: number): Promise<SourceItem[]> {
	const response = await fetchResponse(TRENDING_URL);
	const items: SourceItem[] = [];

	let repo = "";
	let description = "";
	let language = "";
	let stars = "";
	let starsToday = "";

	const flush = () => {
		if (repo) {
			items.push({
				title: repo,
				url: `https://github.com/${repo}`,
				meta: [
					starsToday || undefined,
					stars ? `共 ${stars} stars` : undefined,
					language || undefined,
				]
					.filter(Boolean)
					.join(" · "),
				detail: clamp(description.replace(/\s+/g, " ").trim(), 240) || undefined,
			});
		}
		repo = "";
		description = "";
		language = "";
		stars = "";
		starsToday = "";
	};

	await new HTMLRewriter()
		.on("article.Box-row", {
			element(article) {
				if (items.length >= limit) {
					article.remove();
					return;
				}
				article.onEndTag(() => flush());
			},
		})
		.on("article.Box-row h2 a", {
			element(anchor) {
				const href = anchor.getAttribute("href");
				if (href) repo = href.replace(/^\//, "");
			},
		})
		.on("article.Box-row p.col-9", {
			text(chunk) {
				description += chunk.text;
			},
		})
		.on('article.Box-row span[itemprop="programmingLanguage"]', {
			text(chunk) {
				language += chunk.text;
			},
		})
		.on('article.Box-row a[href$="/stargazers"]', {
			text(chunk) {
				stars += chunk.text;
			},
		})
		.on("article.Box-row span.float-sm-right", {
			text(chunk) {
				starsToday += chunk.text;
			},
		})
		.transform(response)
		.text();

	return items
		.slice(0, limit)
		.map((item) => ({ ...item, meta: item.meta?.replace(/\s+/g, " ").trim() }));
}
