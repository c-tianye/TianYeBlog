import type { APIContext, InferGetStaticPropsType } from "astro";
import satori, { type SatoriOptions } from "satori";
import sharp from "sharp";
import RobotoMonoBold from "@/assets/roboto-mono-700.ttf";
import RobotoMono from "@/assets/roboto-mono-regular.ttf";
import { getAllPosts } from "@/data/post";
import { type Lang, useTranslations } from "@/i18n/ui";
import { siteConfig } from "@/site.config";
import { getFormattedDate } from "@/utils/date";
import { readCache, writeToCache } from "./_cacheUtil";
import { ogMarkup } from "./_ogMarkup";

const ogOptions: SatoriOptions = {
	// debug: true,
	fonts: [
		{
			data: Buffer.from(RobotoMono),
			name: "Roboto Mono",
			style: "normal",
			weight: 400,
		},
		{
			data: Buffer.from(RobotoMonoBold),
			name: "Roboto Mono",
			style: "normal",
			weight: 700,
		},
	],
	height: 630,
	width: 1200,
};

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export async function GET(context: APIContext) {
	const { pubDate, title, lang } = context.props as Props;

	// check the og-image cache
	let pngBuffer = readCache(title, pubDate);
	if (!pngBuffer) {
		console.info(`Generating new OG image for: ${title}`);
		const postDate = getFormattedDate(
			pubDate,
			{
				month: "long",
				weekday: "long",
			},
			lang,
		);
		const siteTitle = useTranslations(lang)("site.title");
		const svg = await satori(
			ogMarkup(title, postDate, siteTitle, siteConfig.author) as never,
			ogOptions,
		);
		pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
		writeToCache(title, pubDate, pngBuffer);
	}

	return new Response(new Uint8Array(pngBuffer), {
		headers: {
			"Cache-Control": "public, max-age=31536000, immutable",
			"Content-Type": "image/png",
		},
	});
}

export async function getStaticPaths() {
	// Chinese posts are served from /og-image/<slug>.png, English ones from /og-image/en/<slug>.png
	const posts = await getAllPosts("zh");
	const postsEn = await getAllPosts("en");

	const byLang = (lang: Lang, entries: Awaited<ReturnType<typeof getAllPosts>>) =>
		entries
			.filter(({ data }) => !data.ogImage)
			.map((post) => ({
				params: { slug: lang === "en" ? `en/${post.id}` : post.id },
				props: {
					lang,
					pubDate: post.data.updatedDate ?? post.data.publishDate,
					title: post.data.title,
				},
			}));

	return [...byLang("zh", posts), ...byLang("en", postsEn)];
}
