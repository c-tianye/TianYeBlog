/**
 * Minimal RSS 2.0 / Atom parser.
 *
 * Workers have no DOMParser, and the feeds we consume are small and well formed, so a
 * tag-based scan is enough — no dependency needed.
 */

export interface FeedItem {
	title: string;
	link: string;
	date?: Date | undefined;
	summary?: string | undefined;
}

const ENTITIES: Record<string, string> = {
	amp: "&",
	apos: "'",
	gt: ">",
	lt: "<",
	nbsp: " ",
	quot: '"',
};

export function decodeEntities(input: string): string {
	return input
		.replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => codePoint(Number.parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, dec: string) => codePoint(Number.parseInt(dec, 10)))
		.replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

function codePoint(value: number): string {
	try {
		return String.fromCodePoint(value);
	} catch {
		return "";
	}
}

/** Strip tags + entities and collapse whitespace. */
export function stripHtml(input: string): string {
	return decodeEntities(input.replace(/<[^>]*>/g, " "))
		.replace(/\s+/g, " ")
		.trim();
}

export function clamp(input: string, max: number): string {
	if (input.length <= max) return input;
	return `${input.slice(0, max - 1).trimEnd()}…`;
}

function unwrapCdata(value: string): string {
	const match = value.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
	return match?.[1] ?? value;
}

function tagText(block: string, tag: string): string | undefined {
	const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
	if (match?.[1] === undefined) return undefined;
	return unwrapCdata(match[1]).trim();
}

function firstTag(block: string, tags: string[]): string | undefined {
	for (const tag of tags) {
		const value = tagText(block, tag);
		if (value !== undefined && value !== "") return value;
	}
	return undefined;
}

/** Atom keeps the URL in an attribute: `<link rel="alternate" href="…"/>` */
function atomLink(block: string): string | undefined {
	const tags = [...block.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
	const preferred = tags.find((tag) => /rel="(alternate|self)"/i.test(tag)) ?? tags[0];
	return preferred?.match(/href="([^"]+)"/i)?.[1];
}

/**
 * Resolve an item URL across feed flavours:
 * RSS uses `<link>url</link>`, Atom uses `<link href="…"/>`, and `<guid>/<id>` are last resorts
 * (Atom `<id>` is often a non-URL tag like `t3_abc`, so it must not shadow the real link).
 */
function resolveLink(block: string): string | undefined {
	const candidates = [
		firstTag(block, ["link"]),
		atomLink(block),
		firstTag(block, ["guid"]),
		firstTag(block, ["id"]),
	];
	return candidates
		.map((value) => (value ? stripHtml(value) : ""))
		.find((value) => value.startsWith("http"));
}

export function parseFeed(xml: string, options: { summaryLimit?: number } = {}): FeedItem[] {
	const summaryLimit = options.summaryLimit ?? 400;
	const blocks = [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].map(
		(match) => match[2] ?? "",
	);

	const items: FeedItem[] = [];
	for (const block of blocks) {
		const title = stripHtml(firstTag(block, ["title"]) ?? "");
		const link = resolveLink(block);
		if (!link) continue;

		const rawDate = firstTag(block, ["pubDate", "published", "updated", "dc:date", "date"]);
		const parsedDate = rawDate ? new Date(rawDate) : undefined;
		const summary = stripHtml(
			firstTag(block, ["description", "summary", "content:encoded", "content"]) ?? "",
		);

		items.push({
			date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined,
			link,
			summary: summary ? clamp(summary, summaryLimit) : undefined,
			title: title || link,
		});
	}

	return items;
}
