/** Shared fetch helpers: every outbound request gets a UA and a timeout. */

export const USER_AGENT =
	"TianYeDigestBot/1.0 (+https://blog.luxstarspace.com/about/; tech digest generator)";

export interface FetchOptions {
	headers?: Record<string, string>;
	timeoutMs?: number;
	/** Added to the default UA, e.g. the Reddit/github specific suffix */
	userAgent?: string;
}

async function request(url: string, options: FetchOptions = {}): Promise<Response> {
	const timeoutMs = options.timeoutMs ?? 20_000;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);
	try {
		return await fetch(url, {
			headers: {
				"user-agent": options.userAgent ?? USER_AGENT,
				accept: "*/*",
				...options.headers,
			},
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timer);
	}
}

export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
	const response = await request(url, options);
	if (!response.ok) {
		throw new Error(`${url} -> HTTP ${response.status}`);
	}
	return await response.text();
}

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
	const response = await request(url, {
		...options,
		headers: { accept: "application/json", ...options.headers },
	});
	if (!response.ok) {
		throw new Error(`${url} -> HTTP ${response.status}`);
	}
	return (await response.json()) as T;
}

export async function fetchResponse(url: string, options: FetchOptions = {}): Promise<Response> {
	const response = await request(url, options);
	if (!response.ok) {
		throw new Error(`${url} -> HTTP ${response.status}`);
	}
	return response;
}

/** GitHub API headers, authenticated when a token is available (5000 req/h instead of 60). */
export function githubHeaders(token?: string): Record<string, string> {
	const headers: Record<string, string> = {
		accept: "application/vnd.github+json",
		"x-github-api-version": "2022-11-28",
	};
	if (token) headers.authorization = `Bearer ${token}`;
	return headers;
}
