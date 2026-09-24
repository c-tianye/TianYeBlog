import { fetchJson, fetchResponse, fetchText, githubHeaders } from "../http.ts";
import { clamp, parseFeed, stripHtml } from "../rss.ts";
import { daysAgo } from "../time.ts";
import type { Source, SourceItem } from "../types.ts";

/** New PEPs are rare, so look back further than the group cadence. */
const PEP_LOOKBACK_DAYS = 21;
const NEWS_LOOKBACK_DAYS = 14;
const CHANGELOG_ITEMS = 6;

const PEP_API = "https://peps.python.org/api/peps.json";
const PYTHON_INSIDER = "https://pythoninsider.blogspot.com/feeds/posts/default?alt=rss";
const CHANGELOG_URL = "https://docs.python.org/3/whatsnew/changelog.html";

interface Pep {
	created?: string;
	status?: string;
	title?: string;
	url?: string;
}

interface GithubRelease {
	body?: string;
	draft?: boolean;
	html_url: string;
	name?: string;
	prerelease?: boolean;
	published_at?: string;
	tag_name: string;
}

/**
 * "Python 官方技术文档" — three official streams, in priority order:
 * 1. new/changed PEPs (peps.python.org JSON API)
 * 2. Python Insider posts (PSF release announcements)
 * 3. CPython 3 changelog "Python next" entries (scraped from docs.python.org)
 */
export const pythonDocs: Source = {
	id: "python-docs",
	group: "daily",
	names: { zh: "Python 官方技术文档", en: "Python docs & PEPs" },
	homepage: "https://docs.python.org/3/whatsnew/",
	enabled: true,
	windowHours: NEWS_LOOKBACK_DAYS * 24,
	async fetch({ env, now, limit }) {
		const [peps, news, changelog] = await Promise.allSettled([
			collectNewPeps(now),
			collectInsiderNews(now),
			env.PYTHON_CHANGELOG === "true" ? collectChangelog() : Promise.resolve([]),
		]);

		const items: SourceItem[] = [];
		if (peps.status === "fulfilled") items.push(...peps.value);
		if (news.status === "fulfilled") items.push(...news.value);
		if (changelog.status === "fulfilled") items.push(...changelog.value);

		const releases = await Promise.allSettled([collectCpythonReleases(env, now)]);
		for (const result of releases) {
			if (result.status === "fulfilled") items.push(...result.value);
		}

		return items.slice(0, limit);
	},
};

async function collectNewPeps(now: Date): Promise<SourceItem[]> {
	const since = daysAgo(now, PEP_LOOKBACK_DAYS);
	const peps = await fetchJson<Record<string, Pep>>(PEP_API);

	return Object.entries(peps)
		.map(([id, pep]) => ({ id, pep }))
		.filter(({ pep }) => {
			if (!pep.created) return false;
			const created = new Date(pep.created);
			return !Number.isNaN(created.getTime()) && created >= since;
		})
		.sort((a, b) => Number(b.id) - Number(a.id))
		.slice(0, 6)
		.map(({ id, pep }) => ({
			title: `PEP ${id}: ${pep.title ?? ""}`.trim(),
			url: pep.url ?? `https://peps.python.org/pep-${id.padStart(4, "0")}/`,
			meta: ["新建 PEP", pep.status, pep.created ? `创建于 ${pep.created}` : undefined]
				.filter(Boolean)
				.join(" · "),
		}));
}

async function collectInsiderNews(now: Date): Promise<SourceItem[]> {
	const since = daysAgo(now, NEWS_LOOKBACK_DAYS);
	const xml = await fetchText(PYTHON_INSIDER);
	return parseFeed(xml, { summaryLimit: 300 })
		.filter((entry) => !entry.date || entry.date >= since)
		.slice(0, 5)
		.map((entry) => ({
			title: entry.title,
			url: entry.link,
			meta: ["Python Insider（官方博客）", entry.date?.toISOString().slice(0, 10)]
				.filter(Boolean)
				.join(" · "),
			detail: entry.summary,
		}));
}

async function collectCpythonReleases(
	env: { GITHUB_TOKEN?: string },
	now: Date,
): Promise<SourceItem[]> {
	const since = daysAgo(now, NEWS_LOOKBACK_DAYS);
	const releases = await fetchJson<GithubRelease[]>(
		"https://api.github.com/repos/python/cpython/releases?per_page=5",
		{ headers: githubHeaders(env.GITHUB_TOKEN) },
	).catch(() => [] as GithubRelease[]);

	return releases
		.filter((release) => !release.draft)
		.filter((release) => {
			if (!release.published_at) return false;
			return new Date(release.published_at) >= since;
		})
		.map((release) => ({
			title: `CPython ${release.tag_name}`,
			url: release.html_url,
			meta: ["CPython release", release.published_at?.slice(0, 10)].filter(Boolean).join(" · "),
			detail: release.body ? clamp(release.body.replace(/\r/g, ""), 400) : undefined,
		}));
}

/**
 * Scrapes the "Python next" section of the CPython 3 changelog.
 *
 * Note: the page is ~6MB, so this is the most CPU heavy part of the worker. It is gated behind
 * PYTHON_CHANGELOG=true because the free Workers plan only allows 10ms CPU per invocation.
 */
async function collectChangelog(): Promise<SourceItem[]> {
	const response = await fetchResponse(CHANGELOG_URL);
	const items: SourceItem[] = [];

	let active = false;
	let text = "";
	let href: string | undefined;

	await new HTMLRewriter()
		.on("section#python-next li", {
			element(listItem) {
				if (items.length >= CHANGELOG_ITEMS) {
					listItem.remove();
					return;
				}
				active = true;
				text = "";
				href = undefined;
				listItem.onEndTag(() => {
					const value = stripHtml(text);
					if (value) {
						items.push({
							title: clamp(value, 180),
							url: href ?? CHANGELOG_URL,
							meta: "CPython 3 未发布变更（Python next，来自官方文档）",
						});
					}
					active = false;
				});
			},
			text(chunk) {
				if (active) text += chunk.text;
			},
		})
		.on("section#python-next li a", {
			element(anchor) {
				if (href) return;
				const value = anchor.getAttribute("href");
				if (!value) return;
				href = value.startsWith("http")
					? value
					: `https://docs.python.org/3/whatsnew/${value.replace(/^\.\//, "")}`;
			},
		})
		.transform(response)
		.text();

	return items;
}
