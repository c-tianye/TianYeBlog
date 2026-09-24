import type { Env } from "./env.ts";

/** The three digest series (see wrangler.jsonc `crons`) */
export type Group = "hn" | "daily" | "weekly" | "pi";

/** One crawled entry, as fed to the summariser */
export interface SourceItem {
	title: string;
	url: string;
	/** Short raw metadata: score, comments, stars, date … */
	meta?: string | undefined;
	/** Longer raw text the model may summarise (already clamped) */
	detail?: string | undefined;
	/**
	 * Extra URLs that legitimately belong to this item (inline PR/issue/doc links found on the
	 * page). They are allowed by the link guard and offered to the model as citable sources.
	 */
	links?: string[] | undefined;
}

export interface SourceContext {
	env: Env;
	/** Time of the run */
	now: Date;
	/** How far back this source should look */
	since: Date;
	/** Max number of items to return */
	limit: number;
	/**
	 * URLs already published by this source. Lets a source avoid expensive work (e.g. fetching a
	 * detail page) for entries the orchestrator would drop afterwards.
	 */
	seen: Set<string>;
}

export interface Source {
	id: string;
	group: Group;
	names: { zh: string; en: string };
	homepage: string;
	/** Disabled sources are reported in the run result and skipped */
	enabled: boolean;
	disabledReason?: string | undefined;
	/** Lookback window in hours (independent of the group cadence) */
	windowHours: number;
	fetch(ctx: SourceContext): Promise<SourceItem[]>;
}

/** Thrown by a source when it cannot run right now (rate limit, missing credential …) */
export class SourceSkipped extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SourceSkipped";
	}
}

export interface SourceReport {
	id: string;
	name: string;
	status: "ok" | "skipped" | "failed";
	/** items returned by the source, before de-duplication */
	fetched: number;
	/** items that were not seen before */
	fresh: number;
	error?: string | undefined;
}

export interface RunReport {
	group: Group;
	startedAt: string;
	durationMs: number;
	trigger: string;
	sources: SourceReport[];
	/** total fresh items considered */
	items: number;
	/** whether a post was committed */
	committed: boolean;
	skipped?: string | undefined;
	commit?: { sha: string; files: string[] } | undefined;
	error?: string | undefined;
}
