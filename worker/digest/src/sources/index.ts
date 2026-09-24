import type { Source } from "../types.ts";
import { githubTrending } from "./github-trending.ts";
import { hackernews } from "./hackernews.ts";
import { hellogithub } from "./hellogithub.ts";
import { koalaOss } from "./koala-oss.ts";
import { piChangelog } from "./pi-changelog.ts";
import { pythonDocs } from "./python-docs.ts";
import { reddit } from "./reddit.ts";
import { twitter } from "./twitter.ts";
import { viteReact } from "./vite-react.ts";

/** id => source. Ids are referenced by src/groups.ts. */
export const sources: Record<string, Source> = {
	"github-trending": githubTrending,
	hackernews,
	hellogithub,
	"koala-oss": koalaOss,
	"pi-changelog": piChangelog,
	"python-docs": pythonDocs,
	reddit,
	twitter,
	"vite-react": viteReact,
};

export const sourceList: Source[] = Object.values(sources);
