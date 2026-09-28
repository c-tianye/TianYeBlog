import type { Source } from "../types.ts";
import { aiLabs } from "./ai-labs.ts";
import { aiResearch } from "./ai-research.ts";
import { cryptoNews } from "./crypto-news.ts";
import { finance } from "./finance.ts";
import { githubTrending } from "./github-trending.ts";
import { hackernews } from "./hackernews.ts";
import { hellogithub } from "./hellogithub.ts";
import { koalaOss } from "./koala-oss.ts";
import { piChangelog } from "./pi-changelog.ts";
import { pythonDocs } from "./python-docs.ts";
import { reddit } from "./reddit.ts";
import { techBusiness } from "./tech-business.ts";
import { techMedia } from "./tech-media.ts";
import { twitter } from "./twitter.ts";
import { viteReact } from "./vite-react.ts";

/** id => source. Ids are referenced by src/groups.ts. */
export const sources: Record<string, Source> = {
	"ai-labs": aiLabs,
	"ai-research": aiResearch,
	"crypto-news": cryptoNews,
	finance,
	"github-trending": githubTrending,
	hackernews,
	hellogithub,
	"koala-oss": koalaOss,
	"pi-changelog": piChangelog,
	"python-docs": pythonDocs,
	reddit,
	"tech-business": techBusiness,
	"tech-media": techMedia,
	twitter,
	"vite-react": viteReact,
};

export const sourceList: Source[] = Object.values(sources);
