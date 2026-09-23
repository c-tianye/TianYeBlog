import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_MODEL, MODEL_FALLBACKS, shouldTryNextModel } from "../src/summarize.ts";

/**
 * Guards against the failure mode we already hit once: a hand-written model id that does not
 * exist ("gemini-3.8-flash-lite"), or a default that silently drifts away from the fallbacks.
 */
test("model ids follow Google's naming scheme", () => {
	const pattern = /^gemini-[\d.]+-(flash|flash-lite|pro)(-[a-z]+)*$/;
	assert.match(DEFAULT_MODEL, pattern);
	for (const model of MODEL_FALLBACKS) assert.match(model, pattern);
	assert.ok(
		MODEL_FALLBACKS.includes(DEFAULT_MODEL),
		`${DEFAULT_MODEL} must be part of MODEL_FALLBACKS`,
	);
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
	assert.equal(shouldTryNextModel(new Error("Gemini[gemini-3.8-flash] 400: API key not valid")), false);
	assert.equal(shouldTryNextModel(new Error("Gemini[gemini-3.8-flash] 403: permission denied")), false);
	assert.equal(shouldTryNextModel(new Error("Gemini[gemini-3.8-flash] 400: invalid JSON payload")), false);
});
