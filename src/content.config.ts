import { defineCollection, type SchemaContext } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

function removeDupsAndLowerCase(array: string[]) {
	return [...new Set(array.map((str) => str.toLowerCase()))];
}

const titleSchema = z.string().max(60);

const baseSchema = z.object({
	title: titleSchema,
});

const postSchema = ({ image }: SchemaContext) =>
	baseSchema.extend({
		description: z.string(),
		coverImage: z
			.object({
				alt: z.string(),
				src: image(),
			})
			.optional(),
		draft: z.boolean().default(false),
		ogImage: z.string().optional(),
		tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
		publishDate: z
			.string()
			.or(z.date())
			.transform((val) => new Date(val)),
		updatedDate: z
			.string()
			.optional()
			.transform((str) => (str ? new Date(str) : undefined)),
		pinned: z.boolean().default(false),
	});

const noteSchema = baseSchema.extend({
	description: z.string().optional(),
	publishDate: z.iso
		.datetime({ offset: true }) // Ensures ISO 8601 format with offsets allowed (e.g. "2024-01-01T00:00:00Z" and "2024-01-01T00:00:00+02:00")
		.transform((val) => new Date(val)),
});

const tagSchema = z.object({
	title: titleSchema.optional(),
	description: z.string().optional(),
	// Slug of the same tag in the other locale, used to link tag pages across languages
	translation: z.string().optional(),
});

/**
 * Content is split per locale:
 * - `post` / `note` / `tag`       -> Chinese, lives in content/{posts,notes,tags}
 * - `postEn` / `noteEn` / `tagEn` -> English, lives in content/en/{posts,notes,tags}
 */
const post = defineCollection({
	loader: glob({ base: "./content/posts", pattern: "**/*.{md,mdx}" }),
	schema: postSchema,
});

const postEn = defineCollection({
	loader: glob({ base: "./content/en/posts", pattern: "**/*.{md,mdx}" }),
	schema: postSchema,
});

const note = defineCollection({
	loader: glob({ base: "./content/notes", pattern: "**/*.{md,mdx}" }),
	schema: noteSchema,
});

const noteEn = defineCollection({
	loader: glob({ base: "./content/en/notes", pattern: "**/*.{md,mdx}" }),
	schema: noteSchema,
});

const tag = defineCollection({
	loader: glob({ base: "./content/tags", pattern: "**/*.{md,mdx}" }),
	schema: tagSchema,
});

const tagEn = defineCollection({
	loader: glob({ base: "./content/en/tags", pattern: "**/*.{md,mdx}" }),
	schema: tagSchema,
});

export const collections = { post, postEn, note, noteEn, tag, tagEn };
