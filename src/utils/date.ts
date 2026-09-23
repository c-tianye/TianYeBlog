import { defaultLang, htmlLang, type Lang } from "@/i18n/ui";
import { siteConfig } from "@/site.config";
import type { NoteEntry, PostEntry } from "@/types";

export function getFormattedDate(
	date: Date | undefined,
	options?: Intl.DateTimeFormatOptions,
	lang: Lang = defaultLang,
): string {
	if (date === undefined) {
		return "Invalid Date";
	}

	return new Intl.DateTimeFormat(htmlLang[lang], {
		...(siteConfig.date.options as Intl.DateTimeFormatOptions),
		...options,
	}).format(date);
}

export function collectionDateSort(a: PostEntry | NoteEntry, b: PostEntry | NoteEntry) {
	return b.data.publishDate.getTime() - a.data.publishDate.getTime();
}
