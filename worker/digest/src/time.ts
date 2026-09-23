/** Asia/Shanghai is UTC+8 all year round, so a fixed offset is safe and avoids ICU dependency. */
const CST_OFFSET_MS = 8 * 60 * 60 * 1000;

const pad = (value: number, width = 2) => String(value).padStart(width, "0");

export interface CstParts {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
}

/** Wall-clock time in CST for a given instant. */
export function cstParts(date: Date): CstParts {
	const shifted = new Date(date.getTime() + CST_OFFSET_MS);
	return {
		year: shifted.getUTCFullYear(),
		month: shifted.getUTCMonth() + 1,
		day: shifted.getUTCDate(),
		hour: shifted.getUTCHours(),
		minute: shifted.getUTCMinutes(),
	};
}

/** `2026-09-23` in CST */
export function cstDate(date: Date): string {
	const { year, month, day } = cstParts(date);
	return `${year}-${pad(month)}-${pad(day)}`;
}

/** `2026-09-23 14:00` in CST */
export function cstDateTime(date: Date): string {
	const { year, month, day, hour, minute } = cstParts(date);
	return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`;
}

/** Frontmatter-safe ISO 8601 with an explicit offset: `2026-09-23T14:00:00+08:00` */
export function cstIso(date: Date): string {
	const { year, month, day, hour, minute } = cstParts(date);
	return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+08:00`;
}

/** `20260923` */
export function cstCompactDate(date: Date): string {
	const { year, month, day } = cstParts(date);
	return `${year}${pad(month)}${pad(day)}`;
}

/** `20260923-1400` */
export function cstCompactStamp(date: Date): string {
	const { hour, minute } = cstParts(date);
	return `${cstCompactDate(date)}-${pad(hour)}${pad(minute)}`;
}

/** ISO week number, e.g. `2026-W39` (weeks start on Monday). */
export function isoWeek(date: Date): string {
	const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const dayNumber = target.getUTCDay() || 7; // Sunday -> 7
	target.setUTCDate(target.getUTCDate() + 4 - dayNumber); // Thursday of this week
	const year = target.getUTCFullYear();
	const yearStart = new Date(Date.UTC(year, 0, 1));
	const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	return `${year}-W${pad(week)}`;
}

export function hoursAgo(now: Date, hours: number): Date {
	return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

export function daysAgo(now: Date, days: number): Date {
	return hoursAgo(now, days * 24);
}

/** `2026-09-23 06:00 UTC`, used in logs and reports */
export function formatUtc(date: Date): string {
	return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/** Loose date parser for feeds (`RFC 822` for RSS, ISO 8601 for Atom). */
export function parseDate(value: string | undefined): Date | undefined {
	if (!value) return undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	const parsed = new Date(trimmed);
	return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
