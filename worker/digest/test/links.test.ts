import assert from "node:assert/strict";
import { test } from "node:test";
import { repairLinks } from "../src/links.ts";

const items = [
	{
		title: "facebook/react v19.3.0",
		url: "https://github.com/facebook/react/releases/tag/v19.3.0",
	},
	{
		title: "vitejs/vite create-vite@9.2.1",
		url: "https://github.com/vitejs/vite/releases/tag/create-vite%409.2.1",
	},
	{ title: "google/ax", url: "https://github.com/google/ax" },
];

test("keeps links that came from the crawl", () => {
	const body = "- [google/ax](https://github.com/google/ax) — agent runtime";
	const result = repairLinks(body, items);
	assert.equal(result.body, body);
	assert.deepEqual(result.repaired, []);
	assert.deepEqual(result.dropped, []);
});

test("repairs a rewritten but recognisable URL", () => {
	// the exact hallucination observed in a real run
	const body = "### [facebook/react v19.3.0](https://github.com/react/react/releases/tag/v19.3.0)";
	const result = repairLinks(body, items);
	assert.equal(
		result.body,
		"### [facebook/react v19.3.0](https://github.com/facebook/react/releases/tag/v19.3.0)",
	);
	assert.equal(result.repaired.length, 1);
});

test("repairs percent-encoding differences via the title", () => {
	const body =
		"- [vitejs/vite create-vite@9.2.1](https://github.com/vitejs/vite/releases/tag/create-vite@9.2.1) — deps";
	const result = repairLinks(body, items);
	assert.ok(result.body.includes("create-vite%409.2.1"));
});

test("matches on titles when the owner prefix was dropped", () => {
	const body =
		"- [react v19.3.0](https://github.com/react/react/releases/tag/v19.3.0) — transitions";
	const result = repairLinks(body, items);
	assert.ok(result.body.includes("https://github.com/facebook/react/releases/tag/v19.3.0"));
});

test("drops links that were never crawled", () => {
	const body =
		"- [Some invented project](https://example.com/invented) — nothing to do with the crawl";
	const result = repairLinks(body, items);
	assert.equal(result.body, "- Some invented project — nothing to do with the crawl");
	assert.deepEqual(result.dropped, ["https://example.com/invented"]);
});
