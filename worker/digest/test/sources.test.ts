import assert from "node:assert/strict";
import { test } from "node:test";
import { groupList } from "../src/groups.ts";
import { sources } from "../src/sources/index.ts";

/**
 * Regression guard for a real data-loss bug: `pi-changelog` used a 72h window, but Pi releases
 * land on an irregular schedule (observed gaps of two weeks). Once a release aged past 72 hours it
 * was filtered out of every subsequent run and could never be published — 0.86.1, 0.87.0 and
 * 0.87.1 were all lost this way.
 *
 * The fix makes `seen` (already-published versions) the source of truth and widens the window to
 * a bound that only limits a first-run backfill. Any source that de-duplicates on a set rather
 * than a window needs a window wide enough to outlive the gap between its upstream releases.
 */
test("pi-changelog keeps a backfill window wide enough for irregular releases", () => {
	const source = sources["pi-changelog"];
	assert.ok(source, "pi-changelog must be registered");
	assert.ok(
		source.windowHours >= 24 * 14,
		`pi-changelog windowHours=${source.windowHours} is too narrow: releases can be 2+ weeks apart`,
	);
});

test("no source claims a window so narrow that a normal publish gap drops content", () => {
	// 12h is the floor: anything tighter cannot survive a single quiet night for a daily outlet.
	for (const source of Object.values(sources)) {
		assert.ok(
			source.windowHours >= 12,
			`${source.id} windowHours=${source.windowHours} is implausibly narrow`,
		);
	}
});

/** A source placed in the wrong group is otherwise only a silent console.error at run time. */
test("every source's group matches the group that lists it", () => {
	const listed = new Set(groupList.flatMap((group) => group.sourceIds));
	for (const [id, source] of Object.entries(sources)) {
		assert.equal(source.group, groupList.find((g) => g.sourceIds.includes(id))?.id);
		assert.ok(listed.has(id), `${id} is defined but no group references it`);
	}
});
