import assert from "node:assert/strict";
import { test } from "node:test";
import { cronList, groupList, groupsFromCron } from "../src/groups.ts";
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

/** `ai` shares the hourly `crypto` cron and must only fire on even hours (its stated cadence). */
test("even-hours-only groups fire on a 2-hour cadence, not hourly", () => {
	const at = (hour: number) => new Date(Date.UTC(2026, 8, 28, hour, 0, 0));

	for (let hour = 0; hour < 24; hour += 1) {
		const fired = groupsFromCron("0 * * * *", at(hour));
		assert.ok(fired.includes("crypto"), `crypto must run every hour (missed ${hour}:00)`);
		assert.equal(
			fired.includes("ai"),
			hour % 2 === 0,
			`ai should ${hour % 2 === 0 ? "" : "not "}run at ${hour}:00`,
		);
	}

	// exactly half the hourly slots, i.e. every 2 hours
	const aiRuns = Array.from({ length: 24 }, (_, h) => groupsFromCron("0 * * * *", at(h))).filter(
		(fired) => fired.includes("ai"),
	).length;
	assert.equal(aiRuns, 12, "ai must run 12 times a day (every 2 hours)");
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
