import type { Env } from "./env";

const API = "https://api.github.com";
const API_VERSION = "2022-11-28";

export interface CommitFile {
	content: string;
	path: string;
}

export interface CommitResult {
	sha: string;
	url: string;
	paths: string[];
}

function target(env: Env): { branch: string; repo: string } {
	return {
		branch: env.BLOG_BRANCH ?? "main",
		repo: env.BLOG_REPO ?? "c-tianye/TianYeBlog",
	};
}

async function github<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
	if (!env.GITHUB_TOKEN) {
		throw new Error("GITHUB_TOKEN is not set (run: npx wrangler secret put GITHUB_TOKEN)");
	}

	const response = await fetch(`${API}${path}`, {
		...init,
		headers: {
			accept: "application/vnd.github+json",
			authorization: `Bearer ${env.GITHUB_TOKEN}`,
			"content-type": "application/json",
			"user-agent": "TianYeDigestBot/1.0",
			"x-github-api-version": API_VERSION,
			...(init.headers ?? {}),
		},
	});

	if (!response.ok) {
		const body = (await response.text()).slice(0, 400);
		throw new Error(`GitHub ${init.method ?? "GET"} ${path} -> ${response.status}: ${body}`);
	}

	return (await response.json()) as T;
}

/** True when the path already exists on the branch (used for idempotency). */
export async function fileExists(env: Env, path: string): Promise<boolean> {
	const { repo, branch } = target(env);
	try {
		await github<unknown>(env, `/repos/${repo}/contents/${encodeURI(path)}?ref=${branch}`);
		return true;
	} catch (error) {
		if ((error as Error).message.includes("-> 404")) return false;
		throw error;
	}
}

/** UTF-8 safe base64, chunked to stay clear of argument limits. */
export function toBase64(input: string): string {
	const bytes = new TextEncoder().encode(input);
	let binary = "";
	const chunkSize = 0x8000;
	for (let index = 0; index < bytes.length; index += chunkSize) {
		const chunk = bytes.subarray(index, index + chunkSize);
		binary += String.fromCharCode(...chunk);
	}
	return btoa(binary);
}

/**
 * Commit several files in a single commit through the Git Data API, so one crawl produces
 * exactly one commit (and therefore one CI build).
 */
export async function commitFiles(
	env: Env,
	files: CommitFile[],
	message: string,
): Promise<CommitResult> {
	const { repo, branch } = target(env);

	const ref = await github<{ object: { sha: string } }>(
		env,
		`/repos/${repo}/git/ref/heads/${branch}`,
	);
	const headSha = ref.object.sha;
	const headCommit = await github<{ tree: { sha: string } }>(
		env,
		`/repos/${repo}/git/commits/${headSha}`,
	);

	const blobs = await Promise.all(
		files.map(async (file) => ({
			path: file.path,
			sha: (
				await github<{ sha: string }>(env, `/repos/${repo}/git/blobs`, {
					body: JSON.stringify({ content: toBase64(file.content), encoding: "base64" }),
					method: "POST",
				})
			).sha,
		})),
	);

	const tree = await github<{ sha: string }>(env, `/repos/${repo}/git/trees`, {
		body: JSON.stringify({
			base_tree: headCommit.tree.sha,
			tree: blobs.map((blob) => ({
				mode: "100644",
				path: blob.path,
				sha: blob.sha,
				type: "blob",
			})),
		}),
		method: "POST",
	});

	const commit = await github<{ html_url: string; sha: string }>(
		env,
		`/repos/${repo}/git/commits`,
		{
			body: JSON.stringify({
				message,
				parents: [headSha],
				tree: tree.sha,
			}),
			method: "POST",
		},
	);

	await github(env, `/repos/${repo}/git/refs/heads/${branch}`, {
		body: JSON.stringify({ sha: commit.sha }),
		method: "PATCH",
	});

	return { paths: files.map((file) => file.path), sha: commit.sha, url: commit.html_url };
}
