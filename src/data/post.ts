import { getCollection } from "astro:content";
import type { Lang } from "@/i18n/ui";
import type { NoteEntry, PostEntry, TagEntry } from "@/types";

/** Map a locale onto its content collections (see src/content.config.ts) */
const collections = {
	zh: { note: "note", post: "post", tag: "tag" },
	en: { note: "noteEn", post: "postEn", tag: "tagEn" },
} as const;

/** filter out draft posts based on the environment */
export async function getAllPosts(lang: Lang = "zh"): Promise<PostEntry[]> {
	return await getCollection(collections[lang].post, ({ data }) => {
		return import.meta.env.PROD ? !data.draft : true;
	});
}

export async function getAllNotes(lang: Lang = "zh"): Promise<NoteEntry[]> {
	return await getCollection(collections[lang].note);
}

/** Get tag metadata by tag name */
export async function getTagMeta(tag: string, lang: Lang = "zh"): Promise<TagEntry | undefined> {
	const tagEntries = await getCollection(collections[lang].tag, (entry) => {
		return entry.id === tag;
	});
	return tagEntries[0];
}

/** groups posts by year (based on option siteConfig.sortPostsByUpdatedDate), using the year as the key
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 */
export function groupPostsByYear(posts: PostEntry[]) {
	return Object.groupBy(posts, (post) => post.data.publishDate.getFullYear().toString());
}

/** returns all tags created from posts (inc duplicate tags)
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 *  */
export function getAllTags(posts: PostEntry[]) {
	return posts.flatMap((post) => [...post.data.tags]);
}

/** returns all unique tags created from posts
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 *  */
export function getUniqueTags(posts: PostEntry[]) {
	return [...new Set(getAllTags(posts))];
}

/** returns a count of each unique tag - [[tagName, count], ...]
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 *  */
export function getUniqueTagsWithCount(posts: PostEntry[]): [string, number][] {
	return [
		...getAllTags(posts).reduce(
			(acc, t) => acc.set(t, (acc.get(t) ?? 0) + 1),
			new Map<string, number>(),
		),
	].sort((a, b) => b[1] - a[1]);
}
