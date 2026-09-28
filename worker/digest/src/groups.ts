import type { Group } from "./types.ts";

/** Which system prompt the summariser should use for this series. */
export type PromptProfile = "digest" | "changelog" | "markets" | "ai";

export interface GroupConfig {
	id: Group;
	/** Cron expression that triggers this group (must match wrangler.jsonc `triggers.crons`). */
	cron: string;
	/** Fallback lookback window in hours. */
	windowHours: number;
	sourceIds: string[];
	/** Post title prefix — the date is appended by the renderer. */
	title: { zh: string; en: string };
	tags: { zh: string[]; en: string[] };
	cadence: { zh: string; en: string };
	/** "digest" = one item per story (default), "changelog" = detailed per-version breakdown */
	promptProfile: PromptProfile;
	/**
	 * Minimum number of fresh items needed to publish. Defaults to DIGEST_MIN_ITEMS (3), which is
	 * right for digests but wrong for releases: a single new version should go out immediately.
	 */
	minItems?: number;
	/**
	 * Only fire at this exact UTC weekday (0 = Sunday) and hour. `weekly` uses { weekday: 1,
	 * hour: 2 } so that sharing the `pi` trigger (every 3 hours) still lands it on Monday
	 * 02:00 UTC / 10:00 CST — its original slot — instead of every 3 hours that day.
	 */
	onlyAt?: { weekday: number; hour: number };
}

export const groups: Record<Group, GroupConfig> = {
	hn: {
		id: "hn",
		cron: "0 */5 * * *",
		windowHours: 24,
		sourceIds: ["hackernews"],
		title: { zh: "科技速览 · HN 热榜", en: "Tech Digest · Hacker News" },
		tags: { zh: ["速览", "hn"], en: ["digest", "hacker-news"] },
		cadence: { zh: "每 5 小时", en: "every 5 hours" },
		promptProfile: "digest",
	},
	daily: {
		id: "daily",
		cron: "0 1 * * *",
		windowHours: 24,
		sourceIds: [
			"vite-react",
			"github-trending",
			"python-docs",
			"reddit",
			"tech-media",
			"tech-business",
			"twitter",
		],
		title: { zh: "科技速览 · 日报", en: "Tech Digest · Daily" },
		tags: { zh: ["速览", "日报"], en: ["digest", "daily"] },
		cadence: { zh: "每天 09:00（CST）", en: "daily at 09:00 CST" },
		promptProfile: "digest",
	},
	weekly: {
		id: "weekly",
		cron: "0 */3 * * *",
		onlyAt: { weekday: 1, hour: 2 },
		windowHours: 24 * 7,
		sourceIds: ["hellogithub", "koala-oss"],
		title: { zh: "科技速览 · 周报", en: "Tech Digest · Weekly" },
		tags: { zh: ["速览", "周报"], en: ["digest", "weekly"] },
		cadence: { zh: "每周一 10:00（CST）", en: "Mondays at 10:00 CST" },
		promptProfile: "digest",
	},
	pi: {
		id: "pi",
		cron: "0 */3 * * *",
		// Only a fallback: the orchestrator uses the *source's* windowHours (30 days for
		// pi-changelog), so unseen releases are backfilled while `seen` prevents repeats.
		windowHours: 72,
		minItems: 1,
		sourceIds: ["pi-changelog"],
		title: { zh: "Pi 版本解读", en: "Pi Releases" },
		tags: { zh: ["速览", "pi"], en: ["digest", "pi"] },
		cadence: { zh: "每 3 小时", en: "every 3 hours" },
		promptProfile: "changelog",
	},
	// Market-moving news is only useful while it is fresh, so this runs every hour. A quiet hour
	// is fine: the sources keep a wider lookback window, and minItems (default 3) still gates
	// publication when nothing new happened.
	crypto: {
		id: "crypto",
		cron: "0 * * * *",
		windowHours: 12,
		sourceIds: ["crypto-news", "finance"],
		title: { zh: "市场速览 · 加密与金融", en: "Market Digest · Crypto & Finance" },
		tags: { zh: ["速览", "加密", "金融"], en: ["digest", "crypto", "finance"] },
		cadence: { zh: "每小时", en: "hourly" },
		promptProfile: "markets",
	},
	// Lab announcements and papers appear a few times a day at most, so every 2 hours is enough to
	// be timely without spending Gemini quota on empty rounds.
	//
	// Kept on its own cron on purpose: one scheduled invocation shares a single 50-subrequest
	// budget across every group it runs, so pairing `ai` with `crypto` made the second group fail
	// with "Too many subrequests". Only genuinely small groups may share a trigger:
	// `weekly` (2 feeds) rides along with `pi` (1 source), which stays far inside the budget.
	ai: {
		id: "ai",
		cron: "0 */2 * * *",
		windowHours: 48,
		sourceIds: ["ai-labs", "ai-research"],
		title: { zh: "AI 速览 · 前沿动态", en: "AI Digest · Frontier" },
		tags: { zh: ["速览", "ai"], en: ["digest", "ai"] },
		cadence: { zh: "每 2 小时", en: "every 2 hours" },
		promptProfile: "ai",
	},
};

export const groupList = Object.values(groups);

/**
 * Crons that actually have to be registered with Cloudflare.
 *
 * `weekly` shares `pi`'s cron, so the distinct list stays at 5 entries — exactly the free-plan
 * account limit. Registering per group instead would need 6 triggers and fail.
 */
export const cronList = [...new Set(groupList.map((group) => group.cron))];

/**
 * Groups triggered by a cron expression.
 *
 * A cron can drive several groups (see `cronList`), which is how the series fit in the free plan's
 * 5 triggers. `onlyAt` groups are filtered out at every other instant, so they keep their own
 * slower cadence while sharing another group's trigger.
 */
export function groupsFromCron(cron: string, at: Date): Group[] {
	const weekday = at.getUTCDay();
	const hour = at.getUTCHours();
	return groupList
		.filter((group) => group.cron === cron)
		.filter(
			(group) => !group.onlyAt || (group.onlyAt.weekday === weekday && group.onlyAt.hour === hour),
		)
		.map((group) => group.id);
}

export function groupConfig(id: Group): GroupConfig {
	return groups[id];
}
