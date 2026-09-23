import type { Source } from "../types";
import { githubTrending } from "./github-trending";
import { hackernews } from "./hackernews";
import { hellogithub } from "./hellogithub";
import { koalaOss } from "./koala-oss";
import { pythonDocs } from "./python-docs";
import { reddit } from "./reddit";
import { twitter } from "./twitter";
import { viteReact } from "./vite-react";

/** id => source. Ids are referenced by src/groups.ts. */
export const sources: Record<string, Source> = {
	"github-trending": githubTrending,
	hackernews,
	hellogithub,
	"koala-oss": koalaOss,
	"python-docs": pythonDocs,
	reddit,
	twitter,
	"vite-react": viteReact,
};

export const sourceList: Source[] = Object.values(sources);
