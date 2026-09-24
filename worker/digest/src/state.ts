import type { Env } from "./env.ts";
import type { RunReport } from "./types.ts";

/** Item key => nothing, kept as a bounded array so one KV read is enough per source. */
const MAX_SEEN_KEYS = 400;
const SEEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const RUNS_KEY = "runs";
const MAX_RUNS = 20;

const seenKey = (sourceId: string) => `seen:${sourceId}`;

export async function loadSeen(env: Env, sourceId: string): Promise<Set<string>> {
	const raw = await env.DIGEST_STATE.get(seenKey(sourceId));
	if (!raw) return new Set();
	try {
		const parsed = JSON.parse(raw) as { keys?: string[] };
		return new Set(parsed.keys ?? []);
	} catch {
		return new Set();
	}
}

export async function rememberSeen(env: Env, sourceId: string, keys: string[]): Promise<void> {
	if (keys.length === 0) return;
	const seen = await loadSeen(env, sourceId);
	for (const key of keys) seen.add(key);
	const trimmed = [...seen].slice(-MAX_SEEN_KEYS);
	await env.DIGEST_STATE.put(seenKey(sourceId), JSON.stringify({ keys: trimmed }), {
		expirationTtl: SEEN_TTL_SECONDS,
	});
}

export async function getRuns(env: Env): Promise<RunReport[]> {
	const raw = await env.DIGEST_STATE.get(RUNS_KEY);
	if (!raw) return [];
	try {
		return JSON.parse(raw) as RunReport[];
	} catch {
		return [];
	}
}

export async function recordRun(env: Env, report: RunReport): Promise<void> {
	const runs = await getRuns(env);
	runs.unshift(report);
	await env.DIGEST_STATE.put(RUNS_KEY, JSON.stringify(runs.slice(0, MAX_RUNS)));
}

/**
 * Drop items that were already part of an earlier digest.
 * `keyOf` lets a source de-duplicate on something more stable than the URL (e.g. a repo name).
 */
export function freshItems<T extends { url: string }>(
	items: T[],
	seen: Set<string>,
	keyOf: (item: T) => string = (item) => item.url,
): T[] {
	return items.filter((item) => !seen.has(keyOf(item)));
}
