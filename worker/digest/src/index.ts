import type { Env } from "./env";
import { commitFiles, fileExists } from "./github";
import { groupConfig, groupFromCron, groupList } from "./groups";
import { buildPost, buildRawSummary, slugFor } from "./render";
import { sources } from "./sources";
import { freshItems, getRuns, loadSeen, recordRun, rememberSeen } from "./state";
import { summarise } from "./summarize";
import { formatUtc, hoursAgo } from "./time";
import { type Group, type RunReport, type SourceItem, SourceSkipped } from "./types";

interface RunOptions {
	group: Group;
	trigger: string;
	/** Render the post but do not commit it */
	dryRun: boolean;
	/** Skip Gemini (raw link list) */
	skipAi: boolean;
	/** Ignore the "already seen" state */
	force: boolean;
}

interface RunResult {
	report: RunReport;
	preview?: { files: { path: string; content: string }[]; slug: string }[];
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const token = request.headers.get("x-digest-token") ?? url.searchParams.get("token");
		const authorized = Boolean(env.TRIGGER_TOKEN) && token === env.TRIGGER_TOKEN;

		if (url.pathname === "/" || url.pathname === "/status") {
			return json({
				enabled: env.DIGEST_ENABLED !== "false",
				groups: groupList.map((group) => ({
					cadence: group.cadence,
					cron: group.cron,
					id: group.id,
					sources: group.sourceIds,
				})),
				ok: true,
				runs: (await getRuns(env)).slice(0, 5),
				secrets: {
					gemini: Boolean(env.GEMINI_API_KEY),
					github: Boolean(env.GITHUB_TOKEN),
					trigger: Boolean(env.TRIGGER_TOKEN),
				},
				sources: Object.values(sources).map((source) => ({
					enabled: source.enabled,
					group: source.group,
					id: source.id,
					name: source.names.zh,
					reason: source.disabledReason,
				})),
			});
		}

		if (url.pathname === "/run") {
			if (!authorized) {
				return json({ error: "unauthorized: send x-digest-token", ok: false }, 401);
			}
			const group = url.searchParams.get("group") as Group | null;
			if (!group || !groupConfig(group)) {
				return json({ error: "group must be one of hn|daily|weekly", ok: false }, 400);
			}

			const result = await runDigest(env, {
				dryRun: url.searchParams.get("dryRun") === "1",
				force: url.searchParams.get("force") === "1",
				group,
				skipAi: url.searchParams.get("skipAi") === "1",
				trigger: "manual",
			});
			return json({ ok: !result.report.error, ...result });
		}

		return json({ error: "not found", ok: false }, 404);
	},

	async scheduled(controller: ScheduledController, env: Env): Promise<void> {
		const group = groupFromCron(controller.cron);
		if (!group) {
			console.error(`digest: no group configured for cron "${controller.cron}"`);
			return;
		}
		const result = await runDigest(env, {
			dryRun: false,
			force: false,
			group,
			skipAi: false,
			trigger: `cron:${controller.cron}`,
		});
		console.log(`digest: ${JSON.stringify(result.report)}`);
	},
} satisfies ExportedHandler<Env>;

async function runDigest(env: Env, options: RunOptions): Promise<RunResult> {
	const startedAt = new Date();
	const config = groupConfig(options.group);
	const limit = Number(env.DIGEST_ITEM_LIMIT ?? 12);
	const minItems = Number(env.DIGEST_MIN_ITEMS ?? 3);

	const report: RunReport = {
		committed: false,
		group: options.group,
		items: 0,
		sources: [],
		startedAt: startedAt.toISOString(),
		trigger: options.trigger,
		durationMs: 0,
	};

	const finish = async (result: RunResult): Promise<RunResult> => {
		result.report.durationMs = Date.now() - startedAt.getTime();
		await recordRun(env, result.report);
		return result;
	};

	if (env.DIGEST_ENABLED === "false") {
		report.skipped = "DIGEST_ENABLED=false";
		return await finish({ report });
	}

	// Fail fast (and cleanly) when the worker has not been configured yet, so the cron keeps
	// producing a readable report instead of an unhandled error.
	const needsAi = !options.skipAi && !env.GEMINI_API_KEY && env.DIGEST_RAW_FALLBACK !== "true";
	const needsToken = !options.dryRun && !env.GITHUB_TOKEN;
	if (needsAi || needsToken) {
		report.skipped = [
			needsAi ? "GEMINI_API_KEY is not set" : undefined,
			needsToken ? "GITHUB_TOKEN is not set" : undefined,
		]
			.filter(Boolean)
			.join("; ");
		console.warn(`digest: skipping run — ${report.skipped}`);
		return await finish({ report });
	}

	const collected: { source: (typeof sources)[string]; items: SourceItem[] }[] = [];

	for (const sourceId of config.sourceIds) {
		const source = sources[sourceId];
		if (!source) {
			console.error(`digest: unknown source id "${sourceId}"`);
			continue;
		}

		if (!source.enabled) {
			report.sources.push({
				error: source.disabledReason,
				fetched: 0,
				fresh: 0,
				id: source.id,
				name: source.names.zh,
				status: "skipped",
			});
			continue;
		}

		try {
			const since = hoursAgo(startedAt, source.windowHours);
			const fetched = await source.fetch({ env, limit, now: startedAt, since });
			const items = options.force ? fetched : freshItems(fetched, await loadSeen(env, source.id));

			report.sources.push({
				fetched: fetched.length,
				fresh: items.length,
				id: source.id,
				name: source.names.zh,
				status: "ok",
			});

			if (items.length > 0) collected.push({ items: items.slice(0, limit), source });
			console.log(
				`digest: ${source.id} fetched=${fetched.length} fresh=${items.length} since=${formatUtc(since)}`,
			);
		} catch (error) {
			const skipped = error instanceof SourceSkipped;
			const message = (error as Error).message.slice(0, 300);
			console.error(`digest: ${source.id} ${skipped ? "skipped" : "failed"}: ${message}`);
			report.sources.push({
				error: message,
				fetched: 0,
				fresh: 0,
				id: source.id,
				name: source.names.zh,
				status: skipped ? "skipped" : "failed",
			});
		}
	}

	report.items = collected.reduce((sum, entry) => sum + entry.items.length, 0);

	if (report.items < minItems) {
		report.skipped = `only ${report.items} new items (< DIGEST_MIN_ITEMS=${minItems})`;
		return await finish({ report });
	}

	const slug = slugFor(options.group, startedAt);
	const paths = [`content/posts/${slug}.md`, `content/en/posts/${slug}.md`];

	if (!options.dryRun && !options.force) {
		const existing = await Promise.all(paths.map((path) => fileExists(env, path)));
		if (existing.every(Boolean)) {
			report.skipped = `post ${slug} already exists`;
			return await finish({ report });
		}
	}

	let summary: Parameters<typeof buildPost>[0]["summary"];
	if (options.skipAi) {
		summary = buildRawSummary({ group: options.group, now: startedAt, sources: collected });
	} else {
		try {
			summary = await summarise(env, {
				group: options.group,
				runAt: startedAt,
				sources: collected,
				windowLabel: config.cadence,
			});
		} catch (error) {
			const message = (error as Error).message;
			console.error(`digest: summarise failed: ${message}`);
			if (env.DIGEST_RAW_FALLBACK !== "true") {
				report.error = `summarise failed: ${message}`;
				return await finish({ report });
			}
			summary = buildRawSummary({ group: options.group, now: startedAt, sources: collected });
		}
	}

	const post = buildPost({
		group: options.group,
		now: startedAt,
		siteUrl: env.SITE_URL ?? "https://blog.luxstarspace.com",
		sources: collected,
		summary,
	});

	if (options.dryRun) {
		report.skipped = "dry run: nothing committed";
		return await finish({ report, preview: [{ files: post.files, slug }] });
	}

	try {
		const commit = await commitFiles(
			env,
			post.files,
			`content(digest): ${options.group} digest ${slug}`,
		);
		report.committed = true;
		report.commit = { files: commit.paths, sha: commit.sha };

		// Only mark items as seen once they are actually in the repository.
		for (const entry of collected) {
			await rememberSeen(
				env,
				entry.source.id,
				entry.items.map((item) => item.url),
			);
		}
	} catch (error) {
		report.error = `commit failed: ${(error as Error).message}`;
		console.error(`digest: ${report.error}`);
	}

	return await finish({ report });
}

function json(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload, null, 2), {
		headers: { "content-type": "application/json; charset=utf-8" },
		status,
	});
}
