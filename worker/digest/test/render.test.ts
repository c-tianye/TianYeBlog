import assert from "node:assert/strict";
import { test } from "node:test";
import { slugFor } from "../src/render.ts";
import type { Group } from "../src/types.ts";

const now = new Date("2026-09-23T07:05:00Z"); // 15:05 CST

/**
 * Regression guard: a group that falls through to `default` inherits another group's slug and
 * silently overwrites that post on the next run.
 */
test("each group gets a distinct slug", () => {
	const groups: Group[] = ["hn", "daily", "weekly", "pi"];
	const slugs = groups.map((group) => slugFor(group, now));
	assert.equal(new Set(slugs).size, groups.length, `slugs collide: ${slugs.join(", ")}`);
	assert.equal(slugFor("pi", now), "digest-pi-20260923-1505");
	assert.equal(slugFor("hn", now), "digest-hn-20260923-1505");
	assert.equal(slugFor("daily", now), "digest-daily-20260923");
	assert.equal(slugFor("weekly", now), "digest-weekly-2026-w39");
});

test("slugs are file-system safe", () => {
	for (const group of ["hn", "daily", "weekly", "pi"] as Group[]) {
		assert.match(slugFor(group, now), /^[a-z0-9-]+$/);
	}
});
