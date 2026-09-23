import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_MODEL, MODEL_FALLBACKS, shouldTryNextModel } from "../src/summarize.ts";

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
