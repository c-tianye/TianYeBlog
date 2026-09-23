import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_MODEL, MODEL_FALLBACKS, isModelUnavailable } from "../src/summarize.ts";

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

test("retired or unknown models are detected, other errors are not", () => {
	assert.equal(
		isModelUnavailable(new Error('Gemini[gemini-2.5-flash] 404: {"status":"NOT_FOUND"}')),
		true,
	);
	assert.equal(
		isModelUnavailable(new Error("Gemini[gemini-2.5-flash] 404: no longer available to new users")),
		true,
	);
	// a bad key or a quota error must fail immediately instead of walking the fallback chain
	assert.equal(isModelUnavailable(new Error("Gemini[gemini-3.8-flash] 400: API key not valid")), false);
	assert.equal(isModelUnavailable(new Error('Gemini[gemini-3.8-flash] 429: rate limited')), false);
});
