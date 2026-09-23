/** Bindings, vars and secrets of the digest worker. */
export interface Env {
	/** KV namespace holding "already seen" item keys and run history */
	DIGEST_STATE: KVNamespace;

	/** Gemini API key — https://aistudio.google.com/apikey (secret) */
	GEMINI_API_KEY?: string;
	/** Fine-grained PAT with `Contents: read & write` on the blog repo (secret) */
	GITHUB_TOKEN?: string;
	/** Token required by the manual `POST /run` endpoint (secret) */
	TRIGGER_TOKEN?: string;

	/** Gemini model id, defaults to gemini-2.5-flash */
	GEMINI_MODEL?: string;
	/** `owner/repo` of the blog, defaults to c-tianye/TianYeBlog */
	BLOG_REPO?: string;
	/** Branch to commit digest posts into, defaults to main */
	BLOG_BRANCH?: string;
	/** Canonical site URL used in the generated footer */
	SITE_URL?: string;
	/** Comma separated subreddit list, defaults to `technology` */
	REDDIT_SUBS?: string;
	/** Optional Reddit "script" app credentials — enables the official API instead of RSS */
	REDDIT_CLIENT_ID?: string;
	REDDIT_CLIENT_SECRET?: string;
	/** Set to `false` to pause all crawling without removing secrets */
	DIGEST_ENABLED?: string;
	/** Max items per source handed to the model, defaults to 12 */
	DIGEST_ITEM_LIMIT?: string;
	/** Skip committing when fewer than this many new items were found, defaults to 3 */
	DIGEST_MIN_ITEMS?: string;
	/** Allow committing a link-only digest when Gemini is unavailable, defaults to false */
	DIGEST_RAW_FALLBACK?: string;
	/**
	 * Also scrape the CPython changelog ("Python next"). Off by default: the page is ~6MB and
	 * parsing it needs more than the 10ms CPU budget of the free Workers plan.
	 */
	PYTHON_CHANGELOG?: string;
}
