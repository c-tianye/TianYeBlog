import type { Group } from "./types";

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
	},
	daily: {
		id: "daily",
		cron: "0 1 * * *",
		windowHours: 24,
		sourceIds: ["vite-react", "github-trending", "python-docs", "reddit", "twitter"],
		title: { zh: "科技速览 · 日报", en: "Tech Digest · Daily" },
		tags: { zh: ["速览", "日报"], en: ["digest", "daily"] },
		cadence: { zh: "每天 09:00（CST）", en: "daily at 09:00 CST" },
	},
	weekly: {
		id: "weekly",
		cron: "0 2 * * 1",
		windowHours: 24 * 7,
		sourceIds: ["hellogithub", "koala-oss"],
		title: { zh: "科技速览 · 周报", en: "Tech Digest · Weekly" },
		tags: { zh: ["速览", "周报"], en: ["digest", "weekly"] },
		cadence: { zh: "每周一 10:00（CST）", en: "Mondays at 10:00 CST" },
	},
};

export const groupList = Object.values(groups);

export function groupFromCron(cron: string): Group | undefined {
	return groupList.find((group) => group.cron === cron)?.id;
}

export function groupConfig(id: Group): GroupConfig {
	return groups[id];
}
