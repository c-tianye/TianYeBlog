import type { Env } from "./env";
import type { Group, Source, SourceItem } from "./types";

/** What Gemini has to produce: one description + markdown body per language. */
export interface Summary {
	zh: { description: string; body: string };
	en: { description: string; body: string };
}

export interface SummariseInput {
	group: Group;
	runAt: Date;
	windowLabel: { zh: string; en: string };
	sources: { source: Source; items: SourceItem[] }[];
}

export const DEFAULT_MODEL = "gemini-3.8-flash";
/**
 * Tried in order when the configured model is not usable for this API key.
 * Google retires models for new accounts ("no longer available to new users" -> HTTP 404),
 * so a deprecated default should not take the whole pipeline down.
 *
 * Every id here must exist in https://ai.google.dev/gemini-api/docs/models — check with
 * `GET /models` (token protected) before adding one, and keep test/summarize.test.ts green.
 */
export const MODEL_FALLBACKS = [
	"gemini-3.8-flash",
	"gemini-3.6-flash",
	"gemini-3.5-flash-lite",
	// rolling aliases stay valid across model retirements
	"gemini-flash-latest",
	"gemini-flash-lite-latest",
	// last resort: older generations that ListModels still advertises for some keys
	"gemini-2.5-pro",
];
const MAX_DESCRIPTION = 200;
const MAX_ATTEMPTS = 3;

const RESPONSE_SCHEMA = {
	type: "object",
	properties: {
		zh: {
			type: "object",
			properties: {
				description: { type: "string" },
				body: { type: "string" },
			},
			required: ["description", "body"],
		},
		en: {
			type: "object",
			properties: {
				description: { type: "string" },
				body: { type: "string" },
			},
			required: ["description", "body"],
		},
	},
	required: ["zh", "en"],
} as const;

const SYSTEM_INSTRUCTION = `你是一名技术编辑，为一个个人技术博客撰写「科技速览」摘要。同时输出中文与英文两个版本。

硬性要求：
- 只能使用用户提供的条目，绝对不要编造事实、版本号、日期或链接；不确定的事情就不要写。
- 链接必须逐字复制输入里的 URL（包含 owner/organization 名、大小写、百分号编码），
  不要改写、不要"修正"、不要替换成你以为更规范的地址（例如不要把 facebook/react 写成 react/react）。
- 每个标题（## / ###）后面必须空一行再写正文。
- 不要输出 frontmatter（---）或一级标题，正文从二级标题（##）开始。
- 中文正文用简体中文；英文正文用自然、地道的英文，不要逐字直译。
- 不要复述条目标题，每条 1-2 句说明「它是什么 / 为什么值得看」。
- 只使用简体中文和英文，不要混入其它文字系统的字符（例如俄文、日文假名）。

中文正文结构：
## 概览
（2-3 句，说明本期最值得注意的事）
## 重点
### [条目标题](原始链接)
（1-2 句说明）
## 其他
- [条目标题](原始链接) —— 一句话
## 小结
（1 句总结）

英文正文结构与上面一一对应，标题用 ## Overview / ## Highlights / ## Also worth reading / ## Takeaway。
英文列表分隔符用 "—"（单个 em dash），不要用中文的 "——"。`;

export async function summarise(env: Env, input: SummariseInput): Promise<Summary> {
	const apiKey = env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error("GEMINI_API_KEY is not set (run: npx wrangler secret put GEMINI_API_KEY)");
	}

	const candidates = [...new Set([env.GEMINI_MODEL ?? DEFAULT_MODEL, ...MODEL_FALLBACKS])];
	let lastError: unknown;

	for (const model of candidates) {
		try {
			const summary = await callGemini(apiKey, model, input);
			console.log(`summarise: used model ${model}`);
			return summary;
		} catch (error) {
			lastError = error;
			if (shouldTryNextModel(error) && model !== candidates.at(-1)) {
				console.warn(
					`summarise: ${model} unusable (${(error as Error).message.slice(0, 120)}), trying the next fallback`,
				);
				continue;
			}
			throw error;
		}
	}

	throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * True when trying the next model in the chain is the right move:
 * - the model was retired / is not enabled for this key (404 NOT_FOUND)
 * - the model is overloaded (503 UNAVAILABLE "high demand")
 * - this model's quota is used up (429 RESOURCE_EXHAUSTED)
 *
 * A bad key (400) or a malformed request must fail immediately instead.
 */
export function shouldTryNextModel(error: unknown): boolean {
	const message = (error as Error).message ?? "";
	return [
		"NOT_FOUND",
		"no longer available",
		"UNAVAILABLE",
		"high demand",
		"overloaded",
		"RESOURCE_EXHAUSTED",
		"quota",
	].some((needle) => message.toLowerCase().includes(needle.toLowerCase()));
}

async function callGemini(apiKey: string, model: string, input: SummariseInput): Promise<Summary> {
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
	const body = {
		systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
		contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
		generationConfig: {
			temperature: 0.4,
			responseMimeType: "application/json",
			responseSchema: RESPONSE_SCHEMA,
		},
	};

	let lastError: unknown;
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
		try {
			const response = await fetch(url, {
				body: JSON.stringify(body),
				headers: {
					"content-type": "application/json",
					"x-goog-api-key": apiKey,
				},
				method: "POST",
			});

			if (response.status === 429 || response.status >= 500) {
				throw new Error(
					`Gemini[${model}] ${response.status}: ${(await response.text()).slice(0, 300)}`,
				);
			}
			if (!response.ok) {
				throw new Error(
					`Gemini[${model}] ${response.status}: ${(await response.text()).slice(0, 500)} — giving up`,
				);
			}

			return parseSummary(await response.json());
		} catch (error) {
			lastError = error;
			const message = (error as Error).message;
			if (message.includes("giving up") || attempt === MAX_ATTEMPTS) break;
			console.warn(`summarise: attempt ${attempt} failed (${message}), retrying`);
			// 503 capacity spikes usually clear in seconds, quota errors do not
			const backoffMs = message.includes("503") ? attempt * 3000 : attempt * 1500;
			await new Promise((resolve) => setTimeout(resolve, backoffMs));
		}
	}

	throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function buildPrompt(input: SummariseInput): string {
	const payload = {
		group: input.group,
		runAt: input.runAt.toISOString(),
		window: input.windowLabel.zh,
		sources: input.sources.map(({ source, items }) => ({
			id: source.id,
			name: source.names.zh,
			homepage: source.homepage,
			items,
		})),
	};

	return `本期分组：${input.group}（${input.windowLabel.zh} / ${input.windowLabel.en}）
抓取时间：${input.runAt.toISOString()}

以下是本期新增条目（JSON，部分条目的 detail/meta 是原始抓取文本，可能含噪音）：

${JSON.stringify(payload, null, 1)}

请按系统提示的结构输出 JSON：{"zh":{"description":"…","body":"…"},"en":{"description":"…","body":"…"}}。
description 控制在 80-150 字符，适合做列表页摘要。`;
}

function parseSummary(raw: unknown): Summary {
	const candidate = raw as {
		candidates?: { content?: { parts?: { text?: string }[] } }[];
	};
	const text = candidate.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
	if (!text) throw new Error("Gemini returned an empty response");

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 200)}`);
	}

	const summary = parsed as Summary;
	for (const lang of ["zh", "en"] as const) {
		const section = summary[lang];
		if (!section?.body || !section.description) {
			throw new Error(`Gemini response is missing the ${lang} section`);
		}
		section.description = section.description.replace(/\s+/g, " ").trim().slice(0, MAX_DESCRIPTION);
		section.body = section.body.trim();
	}

	return summary;
}
