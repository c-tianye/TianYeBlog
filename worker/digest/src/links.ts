import { clamp } from "./rss.ts";

/**
 * Auto-published content must not contain hallucinated links. The model is told to copy URLs
 * verbatim, but it still "helpfully" rewrites them sometimes (observed: facebook/react ->
 * react/react), which would publish 404s.
 *
 * Every markdown link in the generated body is therefore checked against the items that were
 * actually crawled:
 *   - URL is known                  -> keep
 *   - unknown, link text matches an item title -> repair the URL
 *   - unknown and unmatched         -> drop the link, keep the text
 */
export interface LinkCheckResult {
	body: string;
	repaired: string[];
	dropped: string[];
}

export interface LinkSource {
	title: string;
	url: string;
	links?: string[] | undefined;
}

const LINK_RE = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;

/** Characters that differ between the model's output and the crawled title. */
function normalizeText(value: string): string {
	return value
		.replace(/\s+/g, " ")
		.replace(/[’']/g, "'")
		.replace(/^[-–—\s]+|[-–—\s]+$/g, "")
		.trim()
		.toLowerCase();
}

function normalizeUrl(value: string): string {
	let decoded = value;
	try {
		decoded = decodeURIComponent(value);
	} catch {
		// keep the raw value when it is not valid percent-encoding
	}
	return decoded
		.replace(/\/+$/, "")
		.replace(/^https?:\/\//, "")
		.toLowerCase();
}

export function repairLinks(body: string, items: LinkSource[]): LinkCheckResult {
	const allowed = new Map<string, string>();
	for (const item of items) {
		allowed.set(normalizeUrl(item.url), item.url);
		// inline links collected from the same page (PRs, issues, docs) are legitimate too
		for (const link of item.links ?? []) allowed.set(normalizeUrl(link), link);
	}

	const byTitle = new Map<string, string>();
	for (const item of items) {
		byTitle.set(normalizeText(item.title), item.url);
		// the model often drops the owner prefix ("react v19.3.0" for "facebook/react v19.3.0")
		const short = item.title.split("/").at(-1);
		if (short) byTitle.set(normalizeText(short), item.url);
	}

	const repaired: string[] = [];
	const dropped: string[] = [];

	const body2 = body.replace(LINK_RE, (_match, text: string, url: string) => {
		const known = allowed.get(normalizeUrl(url));
		if (known) return `[${text}](${known})`;

		const fromTitle = byTitle.get(normalizeText(text));
		if (fromTitle) {
			repaired.push(`${url} -> ${fromTitle}`);
			return `[${text}](${fromTitle})`;
		}

		dropped.push(url);
		return text;
	});

	return { body: body2, dropped, repaired };
}

/** Repair both language variants and log what changed. */
export function repairSummaryLinks(
	summary: Record<"zh" | "en", { body: string }>,
	items: LinkSource[],
): Record<"zh" | "en", { body: string }> {
	for (const lang of ["zh", "en"] as const) {
		const result = repairLinks(summary[lang].body, items);
		if (result.repaired.length > 0) {
			console.warn(`digest: ${lang} repaired links: ${clamp(result.repaired.join(", "), 300)}`);
		}
		if (result.dropped.length > 0) {
			console.warn(
				`digest: ${lang} dropped unknown links: ${clamp(result.dropped.join(", "), 300)}`,
			);
		}
		summary[lang].body = result.body;
	}
	return summary;
}
