# tianye-digest

定时抓取公开技术信息源 → Gemini 汇总成中英双语摘要 → 提交进博客仓库 → 现有 CI 自动重建上线。

```
Cron Trigger (Worker)
  │
  ├─ 按分组抓取来源（Hacker News / 加密与金融 / AI 实验室与论文 / GitHub 热榜 / Vite·React / Python 官方文档 / Reddit / 工程与商业媒体 / HelloGitHub / Koala / Pi）
  ├─ 与 KV 里的「已收录」集合比对，只保留新条目
  ├─ Gemini 生成 {zh:{description,body}, en:{...}}（结构化 JSON 输出）
  ├─ 渲染 Markdown（frontmatter 由代码生成，不由模型生成）
  └─ GitHub Git Data API 提交一次 commit（中英各一个文件）
        │
        ▼
   .github/workflows/deploy.yml → pnpm build → wrangler deploy
        │
        ▼
   https://blog.luxstarspace.com/posts/digest-…
```

## 系列

| 分组 | Cron (UTC) | 北京时间 | 来源 | 标签（中 / 英） |
| --- | --- | --- | --- | --- |
| `hn` | `0 */5 * * *` | 每 5 小时 | Hacker News | `速览` `hn` / `digest` `hacker-news` |
| `crypto` | `0 * * * *` | **每小时** | 加密资讯（CoinDesk/Cointelegraph/The Block/Decrypt/Blockworks）、金融宏观（CNBC/WSJ/MarketWatch/BBC/美联储/SEC） | `速览` `加密` `金融` / `digest` `crypto` `finance` |
| `ai` | `0 */2 * * *` | **每 2 小时** | AI 实验室官方（OpenAI/Anthropic/Google AI/DeepMind/Hugging Face）、arXiv AI 论文 | `速览` `ai` / `digest` `ai` |
| `daily` | `0 1 * * *` | 每天 09:00 | Vite·React、GitHub 热榜、Python 官方文档、Reddit、技术社区（Lobsters/InfoQ/Cloudflare）、科技媒体（TechCrunch/Ars Technica/The Verge）、~~推特~~ | `速览` `日报` / `digest` `daily` |
| `weekly` | 共用 `0 */3 * * *` | 每周一 10:00 | HelloGitHub、Koala 聊开源 | `速览` `周报` / `digest` `weekly` |
| `pi` | `0 */3 * * *` | 每 3 小时 | Pi 版本更新（pi.dev/changelog） | `速览` `pi` / `digest` `pi` |

> **为什么有两个分组共用 cron**：Cloudflare 免费计划按**整个账号**限 5 个 cron 触发器，但共有 6 个分组。解决办法是让一个轻量分组搭另一组的触发器：
>
> - `weekly` 挂到 `pi` 的 `0 */3 * * *` 上，用 `onlyAt: { weekday: 1, hour: 2 }` 限定为**只在周一 02:00 UTC（10:00 CST，即它原本的时间）触发一次**，而不是当天每 3 小时都跑。
> - 注册时用 `cronList`（去重后）而非逐分组注册，所以正好是 5 条。若升级到 Workers Paid（上限 1000），可给 `weekly` 换回独立的 `0 2 * * 1`。
>
> ⚠️ **不要随便把两个“重”分组合并到一个 cron**：50 次子请求的限制是按**整次 invocation** 计的，不是按分组。曾经把 `crypto` + `ai` 放在同一个 `0 * * * *` 下，结果第二个分组在线报 `Too many subrequests by single Worker invocation`。现在只允许真正小的分组搭车（`pi` 3 个来源 + `weekly` 2 个），`test/render.test.ts` 里有专门断言防止再次过配。

`pi` 分组与其他分组的差别：**1 条新版本就发**（`minItems: 1`，而不是默认的 3），每个版本页单独读取并逐条解读；去重以「已发布版本」集合为准（不依赖时间窗口），上游晚发也不会丢版本，单次最多补 3 个版本。

`crypto` 与 `ai` 各自独占 cron（各自一次 invocation、各自 50 次子请求预算、各自独立的 Gemini 调用）。两者的来源都保留了比 cron 周期更宽的回看窗口（`crypto` 12h / `ai` 48h），安静的一小时不会产出一篇空摘要，`minItems`（默认 3）仍会挡住无实质新增的轮次。

文章 slug：`digest-hn-20260923-1400` / `digest-crypto-20260923-1400` / `digest-ai-20260923-1400` / `digest-daily-20260923` / `digest-weekly-2026-w39` / `digest-pi-20260923-1500`（中英共用同一 slug，语言切换按钮才能对上）。

写作模板（`groups.ts` 的 `promptProfile`）：

| profile | 用于 | 正文结构 |
| --- | --- | --- |
| `digest` | hn / daily / weekly | 概览 → 重点（3-5 条详细）→ 其他（各一行）→ 小结 |
| `changelog` | pi | 版本概览 → 逐版本解读（新增/改动/修复/破坏性变更，关键修复保留 PR 链接）→ 升级建议 |
| `markets` | crypto | 概览 → 加密市场 → 金融与宏观 → 其他 → 小结；禁止编造数字、禁止投资建议与涨跌预测 |
| `ai` | ai | 概览 → 官方动态 → 论文精选 → 其他 → 小结；**arXiv 条目必须标明是预印本**，不能写成已上线产品 |

## 来源与可用性

| id | 来源 | 接口 | 备注 |
| --- | --- | --- | --- |
| `hackernews` | Hacker News | Firebase API（topstories + item） | 分数 ≥ 30，最多取 30 个候选，按分数排序后取 12 |
| `vite-react` | Vite / React | `vite.dev/blog.rss`、`react.dev/rss.xml`、GitHub Releases | 回看 14 天；有 GITHUB_TOKEN 时 GitHub API 额度 5000/h |
| `github-trending` | GitHub 热榜 | `github.com/trending?since=daily` HTML | 用 HTMLRewriter 解析；解析失败自动降级到 Search API |
| `python-docs` | Python 官方技术文档 | PEP API + Python Insider RSS + CPython Releases | 另可开启 CPython changelog 抓取（见下）。**注意 Python Insider 已于 2026-03 从 Blogger 搬到 `blog.python.org`**，旧地址 `pythoninsider.blogspot.com` 已停更且只剩一篇「我们搬家了」，必须用新 feed |
| `reddit` | Reddit 科技热榜 | 官方 OAuth（可选）/ 公开 `.rss` | 数据中心 IP 常被 429/403，失败只标记 `skipped` |
| `hellogithub` | HelloGitHub | `hellogithub.com/rss` | 月刊，新一期出现时才产出入 |
| `koala-oss` | Koala 聊开源 | `koala-oss.app/rss.xml` | 视频/推荐列表，按新条目去重 |
| `pi-changelog` | Pi 版本更新 | `pi.dev/changelog.xml` + 每个版本 `pi.dev/changelog/releases/<version>` | 先从 RSS 取版本列表（按 URL 去重，**已发布过的版本不会再抓详情页**），再逐个读取 release 页面，解析出 New Features / Added / Changed / Fixed / Breaking Changes 各分类与条目，并把条目里的 PR/issue 链接一并交给模型引用 || `twitter` | 推特热榜 | X API `/2/trends/by/woeid/…` | **默认关闭**：trends 端点不在免费层，见 `src/sources/twitter.ts` |
| `crypto-news` | 加密货币资讯 | CoinDesk / Cointelegraph / The Block / Decrypt / Blockworks 的 RSS | 五个源合并为一个 source（共 5 次子请求），按时间排序，每个来源先预留固定条数以免一家刷屏；只需公开 RSS，无需密钥 |
| `finance` | 金融与宏观 | MarketWatch 快讯 / WSJ 市场 / CNBC 市场 / CNBC 财经 / BBC 商业 / 美联储 / SEC 的 RSS | 回看 72 小时；**美联储与 SEC 享有保留名额**（`pin: true`），否则会被每小时刷新的新闻挤出榜单 |
| `ai-labs` | AI 实验室官方动态 | OpenAI / Google AI / Google DeepMind / Hugging Face 的 RSS + Anthropic 新闻页 HTML | Anthropic **不提供 RSS**，用 HTMLRewriter 解析 `a[href^="/news/"] > time + title`；解析失败只丢该来源，不会拖垮整个 `ai` 分组 |
| `ai-research` | arXiv AI 论文 | `export.arxiv.org/api/query`（cs.AI / cs.LG / cs.CL） | **不要用 `export.arxiv.org/rss/cs.AI`**：该 feed 经常整个为空（只有 `<channel>`、没有 `<item>`）；query API 稳定且带 `submittedDate`。三个分类会跨类去重 |
| `tech-media` | 工程与技术社区 | Lobsters / InfoQ / Cloudflare 博客 | 补充 HN 之外的工程长文与基础设施动态 |
| `tech-business` | 科技商业动态 | TechCrunch / Ars Technica / The Verge | 融资、产品发布、平台与政策新闻 |

## 一次性配置

### 1. 变量（`wrangler.jsonc`，已配置）

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `GEMINI_MODEL` | `gemini-3.8-flash` | 不可用时自动回退：`3.6-flash` → `3.5-flash-lite` → `2.5-pro` → `2.5-flash`。触发回退的情况包括模型被下线（404 NOT_FOUND）、**模型过载（503 UNAVAILABLE / high demand）**、配额用尽（429 RESOURCE_EXHAUSTED）；日志会写明实际用了哪个模型 |
| `BLOG_REPO` / `BLOG_BRANCH` | `c-tianye/TianYeBlog` / `main` | 提交目标 |
| `SITE_URL` | `https://blog.luxstarspace.com` | 用于生成正文里的中英互链 |
| `REDDIT_SUBS` | `technology` | 逗号分隔，如 `technology,programming` |
| `PYTHON_CHANGELOG` | `false` | 开启后额外抓取 CPython changelog（页面约 6MB，需要更多 CPU） |
| `DIGEST_ENABLED` | 未设置（=开启） | 设为 `false` 可一键暂停抓取，无需删除密钥 |
| `DIGEST_ITEM_LIMIT` | `12` | 每个来源喂给模型的条目上限 |
| `DIGEST_MIN_ITEMS` | `3` | 新增条目少于此值就不发文章 |
| `DIGEST_RAW_FALLBACK` | `false` | Gemini 失败时是否仍然提交「纯链接列表」 |

### 2. 密钥（必须由你自己填）

```bash
cd worker/digest
npx wrangler secret put GEMINI_API_KEY    # https://aistudio.google.com/apikey
npx wrangler secret put GITHUB_TOKEN      # fine-grained PAT：Contents = Read and write（仅本仓库）
npx wrangler secret put TRIGGER_TOKEN     # 自定义字符串，用于手动触发 /run
```

可选（让 Reddit 走官方 API，比 RSS 稳定且带赞数/评论数）：

```bash
npx wrangler secret put REDDIT_CLIENT_ID      # reddit.com/prefs/apps 建一个 script 应用
npx wrangler secret put REDDIT_CLIENT_SECRET
```

没配密钥时：`GITHUB_TOKEN` 缺失 → 不提交（日志会说明）；`GEMINI_API_KEY` 缺失 → 不生成摘要，整轮跳过（除非 `DIGEST_RAW_FALLBACK=true`）。

### 3. 模型核对

模型 ID 必须与官方列表一致（`gemini-3.8-flash-lite` 这种名字**不存在**）。核对方式：

```bash
curl -s -H "x-digest-token: $TRIGGER_TOKEN" \
  https://tianye-digest.<subdomain>.workers.dev/models | python3 -m json.tool
```

返回你的 key 实际可用（支持 `generateContent`）的模型列表，以及当前配置与回退链。

截至本次核对，官方可用（见 <https://ai.google.dev/gemini-api/docs/models>）：

| 模型 ID | 说明 |
| --- | --- |
| `gemini-3.8-flash` | 当前最新 Flash（默认值） |
| `gemini-3.7-flash` / `gemini-3.6-flash` | 上一代 Flash |
| `gemini-3.5-flash-lite` | 最新 Flash-Lite（Lite 线止于 3.5） |
| `gemini-3.1-flash-lite` / `gemini-2.5-flash-lite` | 更早的 Lite，新账号可能不可用 |

`test/summarize.test.ts` 会校验默认值与回退链里的 ID 符合命名规范且默认值在回退链中。

### 4. KV

`DIGEST_STATE`（id 见 `wrangler.jsonc`）保存两样东西：

- `seen:<sourceId>`：已收录条目的 URL 列表（上限 400 条，TTL 30 天）→ 跨轮次去重
- `runs`：最近 20 次运行报告 → `GET /status` 可见

重建命名空间：

```bash
npx wrangler kv namespace create DIGEST_STATE
# 把输出的 id 填进 wrangler.jsonc
```

### 5. 部署

推送到 `main` 且改动 `worker/digest/**` 时，`.github/workflows/deploy-digest.yml` 会自动 typecheck + test + `wrangler deploy`；也可以本地手动：

```bash
cd worker/digest
pnpm exec wrangler deploy
```

部署时会按 `wrangler.jsonc` 的 `triggers.crons` 创建定时触发器（注意 wrangler v4 里 `crons` 必须放在 `triggers` 下面，写在顶层会被忽略且只给 warning）。

## 本地开发

```bash
pnpm install              # 在仓库根目录（worker/digest 是 pnpm workspace 成员）
cd worker/digest
printf 'TRIGGER_TOKEN=dev\n' > .dev.vars     # 本地密钥，已在 .gitignore
pnpm dev                                      # http://localhost:8787
```

手动跑一轮（`dryRun=1` 只渲染不提交，`skipAi=1` 跳过 Gemini，`force=1` 忽略去重）：

```bash
curl -H 'x-digest-token: dev' 'http://localhost:8787/run?group=daily&dryRun=1&skipAi=1'
curl -H 'x-digest-token: dev' 'http://localhost:8787/run?group=crypto&dryRun=1&debug=1'   # 加密/金融
curl -H 'x-digest-token: dev' 'http://localhost:8787/run?group=ai&dryRun=1&debug=1'       # AI
curl -H 'x-digest-token: dev' 'http://localhost:8787/run?group=weekly&skipAi=1'   # 真提交
curl 'http://localhost:8787/status'                                               # 运行状态
```

单元测试（RSS/Atom 解析等）：

```bash
pnpm test        # node --test
pnpm typecheck
```

## 运维

```bash
npx wrangler tail                                  # 实时日志
curl https://tianye-digest.<subdomain>.workers.dev/status   # 最近运行报告
```

- 核对可用模型：`GET /models`（需 token），换模型时先查再改
- 想停掉抓取：把 `DIGEST_ENABLED` 设为 `"false"` 后重新部署（不必删密钥）
- 想去重失败重来某条：删 KV 里的 `seen:<sourceId>`，或用 `force=1` 手动跑一轮
- 想重新生成当天的日报：先删仓库里对应的 `content/posts/digest-*.md`
- 生成的 commit 会触发 `deploy.yml` 重建博客；如果只想提交不部署，可给 commit 加 `[skip ci]`（本 worker 不加）

## 成本与限制

- **Gemini**：每次运行 1 次请求（中英在一次调用里返回）。新增 `crypto`（每小时）与 `ai`（每 2 小时）后，**理论最大调用量为 24 + 12 = 36 次/天**，加上原有的 hn/daily/weekly/pi；free tier 的 `gemini-2.5-flash` 每日额度仍然够用。`minItems` 会挡掉无实质新增的轮次，实际调用次数通常明显低于上限
- **Workers 计划**：建议 Workers Paid。Free 计划每次调用只有 10ms CPU，抓 GitHub trending（约 550KB HTML）与 CPython changelog（约 6MB）可能超限；超限时该次调用直接失败（不会写坏内容）。`PYTHON_CHANGELOG` 因此默认关闭
- **子请求数**：Free 计划**每次调用**上限 50。各分组现在基本独占 cron，只有 `pi` + `weekly` 共享（周一同时跑约 25 次）。`hn` 最重（≈ 41），如需再扩来源请先减少 HN 的候选数
- **Cron 数量**：Cloudflare **免费计划按整个账号限 5 个 cron 触发器**（不是每个 Worker 5 个）。本项目有 **6 个分组但只注册 5 个 cron**：`weekly` 搭在 `pi` 的 `0 */3 * * *` 上，用 `onlyAt` 限定为只在周一 02:00 UTC（10:00 CST）触发一次，因此**免费计划也能完整部署**。升级 Workers Paid（5 美元/月，上限 1000）后，可把 `weekly` 换回独立的 `0 2 * * 1`。`/status` 的 `crons` 字段返回实际注册的去重列表（正好 5 个）。
- **子请求数与 cron 共享的约束（重要）**：Free 计划每次 invocation 上限 50 次子请求，**这个限制是按整次 invocation 计的，不是按分组**。所以只有当**两个分组都很轻**时才能共用一个 cron。当前 `pi`（3 个来源）+ `weekly`（2 个来源）在周一同时跑约 25 次，安全；而 `crypto`（12）+ `ai`（8）曾经放一起，第二个分组在线报 `Too many subrequests by single Worker invocation`。各分组单独估算（含 Gemini 与 GitHub 提交约 9 次）：`hn` ≈ 41、`daily` ≈ 26、`crypto` ≈ 22、`ai` ≈ 18、`pi` ≈ 13、`weekly` ≈ 12。`test/render.test.ts` 会断言所有共享组合都在 50 以内
- **`windowHours` 的陷阱**：`since` 用的是 **source 的 `windowHours`**（不是 group 的）。用「时间窗口」做去重的来源，窗口必须**宽于上游的发布间隔**，否则上游一旦晚发、内容就会**永久丢失**——`pi-changelog` 曾因 72 小时窗口丢掉 0.86.1 / 0.87.0 / 0.87.1 三个版本。Pi 现在改为以 `seen` 为主要去重手段、窗口放宽到 30 天，`test/sources.test.ts` 会拦住同类回归
- **HTML 解析**：GitHub trending、Pi release 页面与 Anthropic 新闻页走 HTMLRewriter 解析；任一页面解析失败只会丢该来源，不会丢掉整轮
- **已停更/不可用的源**：
  - `pythoninsider.blogspot.com`（Python Insider 旧地址，2026-03 起停更，只剩一篇「我们搬家了」）→ 已换为 `blog.python.org/rss.xml`
  - `finance.yahoo.com/news/rssindex`（滞后约 4 天）、`feeds.a.dj.com/rss/RSSMarketsMain.xml`（停留在 2025-01）→ 已弃用，改用 `feeds.content.dowjones.io` 系列
  - Bloomberg / Reuters 封数据中心 IP，无可用公开 feed
- **链接守卫与内链**：正文里的链接必须来自本次抓取（条目 URL 或页面内联链接），改写过的会按标题自动修正，臆造的会被降级为纯文本
- **Reddit**：RSS 经常限流；配置 OAuth 凭据后才算可靠
- **推特热榜**：需要付费的 X API，默认关闭（代码里预留了接入点）

## 目录

```
src/
  index.ts          # fetch(/status,/run) + scheduled(cron) 编排
  groups.ts         # 各系列（hn/crypto/ai/daily/weekly/pi）的定义与 cron 映射
  sources/          # 每个来源一个文件，统一 Source 接口
  summarize.ts      # Gemini 调用、写作模板与结构化输出校验
  render.ts         # Markdown + frontmatter 渲染（slug 也在这里）
  github.ts         # Git Data API：一次 commit 提交多个文件
  state.ts          # KV：去重集合 + 运行报告
  rss.ts / http.ts  # RSS/Atom 解析、带 UA/超时的 fetch
  time.ts           # CST / ISO week 等时间工具
test/               # node --test 单元测试
```
