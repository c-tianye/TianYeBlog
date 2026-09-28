import assert from "node:assert/strict";
import { test } from "node:test";
import type { PromptProfile } from "../src/groups.ts";
import { groupList } from "../src/groups.ts";
import {
	buildPrompt,
	DEFAULT_MODEL,
	MODEL_FALLBACKS,
	SYSTEM_INSTRUCTIONS,
	shouldTryNextModel,
} from "../src/summarize.ts";
import type { Source, SourceItem } from "../src/types.ts";

/**
 * Guards against the failure mode we already hit once: a hand-written model id that does not
 * exist ("gemini-3.8-flash-lite"), or a default that silently drifts away from the fallbacks.
 */
/**
 * Snapshot of ids confirmed against the live list (https://ai.google.dev/gemini-api/docs/models
 * plus `GET /models` with the blog's own key, 2026-09-23). Adding a model that is not in here
 * fails the test, which is what catches hand-written ids like "gemini-3.8-flash-lite".
 */
const VERIFIED_IDS = new Set([
	"gemini-3.8-flash",
	"gemini-3.7-flash",
	"gemini-3.6-flash",
	"gemini-3.5-flash-lite",
	"gemini-3.1-flash-lite",
	"gemini-2.5-pro",
	"gemini-flash-latest",
	"gemini-flash-lite-latest",
]);

test("every model id in the chain is a verified one", () => {
	for (const model of [DEFAULT_MODEL, ...MODEL_FALLBACKS]) {
		assert.ok(VERIFIED_IDS.has(model), `${model} is not in VERIFIED_IDS — check GET /models first`);
	}
	assert.ok(
		MODEL_FALLBACKS.includes(DEFAULT_MODEL),
		`${DEFAULT_MODEL} must be part of MODEL_FALLBACKS`,
	);
	assert.equal(new Set(MODEL_FALLBACKS).size, MODEL_FALLBACKS.length, "no duplicate fallbacks");
});

test("falls back for retired, overloaded and quota-exhausted models", () => {
	// retired model for this account
	assert.equal(shouldTryNextModel(new Error('404: {"status":"NOT_FOUND"}')), true);
	assert.equal(shouldTryNextModel(new Error("404: no longer available to new users")), true);
	// the real failure we hit: 3.8-flash existed but was capacity constrained
	assert.equal(
		shouldTryNextModel(
			new Error('Gemini[gemini-3.8-flash] 503: {"status":"UNAVAILABLE","message":"high demand"}'),
		),
		true,
	);
	// per-model free tier quota
	assert.equal(shouldTryNextModel(new Error('429: {"status":"RESOURCE_EXHAUSTED"}')), true);
});

test("does not walk the fallback chain for auth or request errors", () => {
	assert.equal(
		shouldTryNextModel(new Error("Gemini[gemini-3.8-flash] 400: API key not valid")),
		false,
	);
	assert.equal(
		shouldTryNextModel(new Error("Gemini[gemini-3.8-flash] 403: permission denied")),
		false,
	);
	assert.equal(
		shouldTryNextModel(new Error("Gemini[gemini-3.8-flash] 400: invalid JSON payload")),
		false,
	);
});

/**
 * Every group declares a prompt profile, and a typo would only surface as a runtime crash on the
 * cron. The record in summarize.ts is exhaustive over PromptProfile, so this checks the values
 * actually in use are the ones that exist.
 */
test("every group uses a known prompt profile", () => {
	const known = new Set(["digest", "changelog", "markets", "ai"]);
	for (const group of groupList) {
		assert.ok(known.has(group.promptProfile), `${group.id}: unknown profile`);
	}
	// the new high-frequency series must not silently fall back to the generic digest voice
	assert.equal(groupList.find((g) => g.id === "crypto")?.promptProfile, "markets");
	assert.equal(groupList.find((g) => g.id === "ai")?.promptProfile, "ai");
});

/**
 * The Gemini path cannot be exercised offline (no API key in CI), so the guardrails that matter
 * most are asserted on the prompt text itself. If someone trims a rule while editing the
 * instructions, this fails instead of silently publishing hallucinated prices or preprint claims.
 */
test("each profile keeps its domain guardrails in the system prompt", () => {
	for (const profile of Object.keys(SYSTEM_INSTRUCTIONS) as PromptProfile[]) {
		const text = SYSTEM_INSTRUCTIONS[profile];
		assert.ok(
			text.includes("不要编造") || text.includes("绝对不要编造"),
			`${profile}: no anti-fabrication rule`,
		);
		assert.ok(text.includes("链接必须逐字复制"), `${profile}: no verbatim-link rule`);
		assert.ok(text.includes("英文"), `${profile}: no English-output rule`);
	}

	// markets: never invent numbers, never give investment advice
	assert.ok(
		SYSTEM_INSTRUCTIONS.markets.includes("涨跌预测") ||
			SYSTEM_INSTRUCTIONS.markets.includes("投资建议"),
	);
	assert.ok(SYSTEM_INSTRUCTIONS.markets.includes("## 加密市场"));
	assert.ok(SYSTEM_INSTRUCTIONS.markets.includes("## 金融与宏观"));

	// ai: must not present a preprint as a shipped product
	assert.ok(SYSTEM_INSTRUCTIONS.ai.includes("预印本"));
	assert.ok(SYSTEM_INSTRUCTIONS.ai.includes("## 官方动态"));
	assert.ok(SYSTEM_INSTRUCTIONS.ai.includes("## 论文精选"));

	// the generic and changelog voices are unchanged in spirit
	assert.ok(SYSTEM_INSTRUCTIONS.digest.includes("## 概览"));
	assert.ok(SYSTEM_INSTRUCTIONS.changelog.includes("## 逐版本解读"));
});

test("the user prompt carries the run window and the crawled items", () => {
	const source = {
		id: "crypto-news",
		group: "crypto",
		names: { zh: "加密货币资讯", en: "Crypto news" },
		homepage: "https://example.com/",
		enabled: true,
		windowHours: 12,
		fetch: async () => [],
	} as Source;
	const items: SourceItem[] = [
		{ title: "Bitcoin ETF sees inflows", url: "https://example.com/a", meta: "Cointelegraph" },
	];

	const prompt = buildPrompt({
		group: "crypto",
		profile: "markets",
		runAt: new Date("2026-09-28T00:00:00Z"),
		windowLabel: { zh: "每小时", en: "hourly" },
		sources: [{ source, items }],
	});

	assert.ok(prompt.includes("本期分组：crypto"));
	assert.ok(prompt.includes("每小时"));
	// the item JSON has to reach the model verbatim
	assert.ok(prompt.includes("Bitcoin ETF sees inflows"));
	assert.ok(prompt.includes("https://example.com/a"));
	// markets runs must ask for the market structure, not the generic digest one
	assert.ok(prompt.includes("加密市场"), "markets prompt lost its section hint");
});
