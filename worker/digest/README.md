# tianye-digest

定时抓取公开技术信息源 → Gemini 汇总成中英双语摘要 → 提交进博客仓库 → 现有 CI 自动重建上线。

```
Cron Trigger (Worker)
  │
  ├─ 按分组抓取来源（Hacker News / GitHub 热榜 / Vite·React / Python 官方文档 / Reddit / HelloGitHub / Koala）
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

## 三个系列

| 分组 | Cron (UTC) | 北京时间 | 来源 | 标签（中 / 英） |
| --- | --- | --- | --- | --- |
| `hn` | `0 */5 * * *` | 每 5 小时 | Hacker News | `速览` `hn` / `digest` `hacker-news` |
| `daily` | `0 1 * * *` | 每天 09:00 | Vite·React、GitHub 热榜、Python 官方文档、Reddit、~~推特~~ | `速览` `日报` / `digest` `daily` |
| `weekly` | `0 2 * * 1` | 每周一 10:00 | HelloGitHub、Koala 聊开源 | `速览` `周报` / `digest` `weekly` |

文章 slug：`digest-hn-20260923-1400` / `digest-daily-20260923` / `digest-weekly-2026-w39`（中英共用同一 slug，语言切换按钮才能对上）。

## 来源与可用性

| id | 来源 | 接口 | 备注 |
| --- | --- | --- | --- |
| `hackernews` | Hacker News | Firebase API（topstories + item） | 分数 ≥ 30，最多取 30 个候选，按分数排序后取 12 |
| `vite-react` | Vite / React | `vite.dev/blog.rss`、`react.dev/rss.xml`、GitHub Releases | 回看 14 天；有 GITHUB_TOKEN 时 GitHub API 额度 5000/h |
| `github-trending` | GitHub 热榜 | `github.com/trending?since=daily` HTML | 用 HTMLRewriter 解析；解析失败自动降级到 Search API |
| `python-docs` | Python 官方技术文档 | PEP API + Python Insider RSS + CPython Releases | 另可开启 CPython changelog 抓取（见下） |
| `reddit` | Reddit 科技热榜 | 官方 OAuth（可选）/ 公开 `.rss` | 数据中心 IP 常被 429/403，失败只标记 `skipped` |
| `hellogithub` | HelloGitHub | `hellogithub.com/rss` | 月刊，新一期出现时才产出入 |
| `koala-oss` | Koala 聊开源 | `koala-oss.app/rss.xml` | 视频/推荐列表，按新条目去重 |
| `twitter` | 推特热榜 | X API `/2/trends/by/woeid/…` | **默认关闭**：trends 端点不在免费层，见 `src/sources/twitter.ts` |

## 一次性配置

### 1. 变量（`wrangler.jsonc`，已配置）

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `GEMINI_MODEL` | `gemini-3.8-flash` | 模型被下线（404/NOT_FOUND）时自动依次回退 `gemini-3.6-flash` → `gemini-3.5-flash-lite`，并在日志里说明实际用了哪个 |
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

- **Gemini**：每次运行 1 次请求（中英在一次调用里返回）。free tier 的 `gemini-2.5-flash` 每天额度足够跑这些频率
- **Workers 计划**：建议 Workers Paid。Free 计划每次调用只有 10ms CPU，抓 GitHub trending（约 550KB HTML）与 CPython changelog（约 6MB）可能超限；超限时该次调用直接失败（不会写坏内容）。`PYTHON_CHANGELOG` 因此默认关闭
- **子请求数**：Free 计划每次调用上限 50。`hn` 分组约用 31（topstories + 30 item）+ Gemini + GitHub(6)，接近上限；如需扩来源请先减少候选数
- **HTML 解析**：GitHub trending 无官方 API，走 HTML 解析，页面改版时靠 Search API 兜底
- **Reddit**：RSS 经常限流；配置 OAuth 凭据后才算可靠
- **推特热榜**：需要付费的 X API，默认关闭（代码里预留了接入点）

## 目录

```
src/
  index.ts          # fetch(/status,/run) + scheduled(cron) 编排
  groups.ts         # 三个系列的定义与 cron 映射
  sources/          # 每个来源一个文件，统一 Source 接口
  summarize.ts      # Gemini 调用与结构化输出校验
  render.ts         # Markdown + frontmatter 渲染（slug 也在这里）
  github.ts         # Git Data API：一次 commit 提交多个文件
  state.ts          # KV：去重集合 + 运行报告
  rss.ts / http.ts  # RSS/Atom 解析、带 UA/超时的 fetch
  time.ts           # CST / ISO week 等时间工具
test/               # node --test 单元测试
```
