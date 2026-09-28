import assert from "node:assert/strict";
import { test } from "node:test";
import { cronList, groupList, groups, groupsFromCron } from "../src/groups.ts";
import { slugFor } from "../src/render.ts";
import { sources } from "../src/sources/index.ts";
import type { Group } from "../src/types.ts";

const now = new Date("2026-09-23T07:05:00Z"); // 15:05 CST

/**
 * Regression guard: a group that falls through to `default` inherits another group's slug and
 * silently overwrites that post on the next run.
 */
test("each group gets a distinct slug", () => {
	const groups: Group[] = ["hn", "daily", "weekly", "pi", "crypto", "ai"];
	const slugs = groups.map((group) => slugFor(group, now));
	assert.equal(new Set(slugs).size, groups.length, `slugs collide: ${slugs.join(", ")}`);
	assert.equal(slugFor("pi", now), "digest-pi-20260923-1505");
	assert.equal(slugFor("hn", now), "digest-hn-20260923-1505");
	assert.equal(slugFor("daily", now), "digest-daily-20260923");
	assert.equal(slugFor("weekly", now), "digest-weekly-2026-w39");
	// crypto and ai share the timestamp format with hn/pi, so only the prefix keeps them apart
	assert.equal(slugFor("crypto", now), "digest-crypto-20260923-1505");
	assert.equal(slugFor("ai", now), "digest-ai-20260923-1505");
});

test("slugs are file-system safe", () => {
	for (const group of ["hn", "daily", "weekly", "pi", "crypto", "ai"] as Group[]) {
		assert.match(slugFor(group, now), /^[a-z0-9-]+$/);
	}
});

/**
 * The cron list in wrangler.jsonc and the group table must stay in sync: a cron with no group is
 * silently ignored at runtime (`groupsFromCron` returns nothing), so the series would just stop.
 */
test("every configured cron maps to a group, and every group has a cron", () => {
	// Several groups may share one cron (`crypto` hosts `ai`), so uniqueness is asserted on the
	// *registered* cron list, not on the per-group field.
	assert.equal(new Set(cronList).size, cronList.length, `duplicate cron: ${cronList.join(", ")}`);
	// The free Workers plan caps triggers at 5 per account; exceeding this makes `deploy` fail.
	assert.ok(
		cronList.length <= 5,
		`${cronList.length} crons configured — the free plan allows 5 triggers per account`,
	);

	for (const group of groupList) {
		assert.ok(cronList.includes(group.cron), `${group.id} has an unregistered cron`);
	}
	assert.equal(groupsFromCron("0 9 * * *", new Date()).length, 0);
});

/** `weekly` shares the `pi` cron and must still fire exactly once a week (Mon 02:00 UTC). */
test("only-at groups keep their own cadence while sharing a trigger", () => {
	const at = (day: number, hour: number) => new Date(Date.UTC(2026, 8, 28 + day, hour, 0, 0));
	// 2026-09-28 is a Monday (getUTCDay() === 1)
	assert.equal(at(0, 2).getUTCDay(), 1, "fixture must start on a Monday");

	// the pi cron fires every 3 hours; weekly must not ride along on all of them
	for (const hour of [0, 3, 6, 9, 12, 18, 21]) {
		assert.deepEqual(
			groupsFromCron("0 */3 * * *", at(0, hour)),
			["pi"],
			`weekly must not run on Monday ${hour}:00`,
		);
	}

	// exactly its original slot: Monday 02:00 UTC = 10:00 CST
	assert.deepEqual(groupsFromCron("0 */3 * * *", at(0, 2)), ["weekly", "pi"]);

	// once per week, not once per day
	assert.deepEqual(groupsFromCron("0 */3 * * *", at(1, 2)), ["pi"], "not on Tuesday");
	assert.deepEqual(groupsFromCron("0 */3 * * *", at(7, 2)), ["weekly", "pi"], "next Monday");

	let weeklyRuns = 0;
	for (let day = 0; day < 21; day += 1) {
		for (let hour = 0; hour < 24; hour += 1) {
			if (groupsFromCron("0 */3 * * *", at(day, hour)).includes("weekly")) weeklyRuns += 1;
		}
	}
	assert.equal(weeklyRuns, 3, "weekly must run once per week (3 times across 21 days)");
});

/**
 * Regression guard for a live failure: `crypto` and `ai` shared one cron, and the 50-subrequest
 * limit applies to the whole scheduled invocation — not per group — so the second group died with
 * "Too many subrequests by single Worker invocation".
 *
 * These are per-run source counts. `gitCommit` covers fileExists x2 + the 7 Git Data API calls,
 * and each group makes one Gemini request.
 */
test("groups sharing a cron stay inside the 50-subrequest invocation budget", () => {
	const GIT_COMMIT = 9;
	const GEMINI = 1;
	const BUDGET = 50;

	// Measured per run; keep these in step with the sources if their feed lists change.
	const sourceCount: Record<string, number> = {
		ai: 8, // ai-labs 5 feeds (incl. the Anthropic page) + ai-research 3 arXiv queries
		crypto: 12, // crypto-news 5 + finance 7
		daily: 16,
		hn: 31,
		pi: 3,
		weekly: 2,
	};

	const costOf = (group: string) => (sourceCount[group] ?? 0) + GEMINI + GIT_COMMIT;

	// every group on its own must fit (a single-trigger group is still one invocation)
	for (const group of groupList) {
		assert.ok(
			costOf(group.id) < BUDGET,
			`${group.id} alone costs ${costOf(group.id)} subrequests (limit ${BUDGET})`,
		);
	}

	// and every sharing combination must fit together
	for (const cron of cronList) {
		const together = groupList
			.filter((group) => group.cron === cron)
			.reduce((sum, group) => sum + costOf(group.id), 0);
		assert.ok(
			together < BUDGET,
			`cron "${cron}" runs ${groupList
				.filter((g) => g.cron === cron)
				.map((g) => g.id)
				.join("+")} = ${together} subrequests (limit ${BUDGET})`,
		);
	}

	// the specific pairing that broke in production must not come back
	assert.notEqual(
		groups.crypto.cron,
		groups.ai.cron,
		"crypto and ai must not share a trigger: together they exceed the subrequest budget",
	);
});

/** A source id typo in groups.ts is only reported as a console.error at run time. */
test("every source id referenced by a group exists", () => {
	for (const group of groupList) {
		assert.ok(group.sourceIds.length > 0, `${group.id} has no sources`);
		for (const sourceId of group.sourceIds) {
			const source = sources[sourceId];
			assert.ok(source, `${group.id} references unknown source "${sourceId}"`);
			assert.equal(source.group, group.id, `${sourceId} is grouped as ${source.group}`);
		}
	}
});
