import rss from "@astrojs/rss";
import { getAllNotes, getAllPosts } from "@/data/post";
import { htmlLang, type Lang, localizePath, useTranslations } from "@/i18n/ui";

/** RSS feed for posts, one per locale: /rss.xml (zh) and /en/rss.xml (en) */
export async function generatePostsFeed(lang: Lang) {
	const t = useTranslations(lang);
	const posts = await getAllPosts(lang);

	return rss({
		title: `${t("site.title")} · ${t("nav.posts")}`,
		description: t("site.description"),
		site: import.meta.env.SITE,
		customData: `<language>${htmlLang[lang]}</language>`,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.publishDate,
			link: localizePath(`/posts/${post.id}/`, lang),
		})),
	});
}

/** RSS feed for notes, one per locale: /notes/rss.xml (zh) and /en/notes/rss.xml (en) */
export async function generateNotesFeed(lang: Lang) {
	const t = useTranslations(lang);
	const notes = await getAllNotes(lang);

	return rss({
		title: `${t("site.title")} · ${t("nav.notes")}`,
		description: t("site.description"),
		site: import.meta.env.SITE,
		customData: `<language>${htmlLang[lang]}</language>`,
		items: notes.map((note) => ({
			title: note.data.title,
			description: note.data.description,
			pubDate: note.data.publishDate,
			link: localizePath(`/notes/${note.id}/`, lang),
		})),
	});
}
