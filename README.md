# 天业 Blog

基于 [Astro Cactus](https://github.com/chrismwilliams/astro-theme-cactus) 主题的个人技术博客，静态构建后部署在 Cloudflare Workers（Static Assets）。

## 技术栈

- Astro 7（静态站点生成）
- 中英双语：中文在根路径，英文在 `/en/`（Astro i18n + `src/i18n/ui.ts` 字典）
- Tailwind CSS v4
- Pagefind（站内搜索，按页面 `lang` 自动切换界面语言）
- pnpm 作为包管理器
- Cloudflare Workers Static Assets 托管

## 本地开发

```bash
pnpm install
pnpm dev          # 开发服务器，默认 http://localhost:4321
pnpm build        # 构建到 dist/，并生成 Pagefind 搜索索引
pnpm preview      # 本地预览构建产物
pnpm check        # astro check + biome check
pnpm lint         # biome check --write
```

## 目录结构

```
content/
  posts/          # 中文文章（Markdown / MDX）
  notes/          # 中文短笔记
  tags/           # 中文标签说明
  en/             # 英文内容，目录结构与上面一一对应
    posts/
    notes/
    tags/
src/
  i18n/ui.ts      # 界面文案字典（中/英）与语言路由工具
  site.config.ts  # 站点作者、域名、导航菜单
  components/     # UI 组件（pages/ 下是中英共用的页面视图）
  layouts/        # 页面布局
  pages/          # 中文路由；英文路由在 pages/en/ 下
  styles/         # 全局样式与设计令牌
public/           # 静态资源（favicon、social card 等）
wrangler.jsonc    # Cloudflare Workers 部署配置
```

## 多语言（中 / 英）

主题上游并不支持多语言，这里的双语能力是自行实现的，规则如下：

| 语言         | 页面地址                            | 内容目录        | 界面文案                 |
| ------------ | ----------------------------------- | --------------- | ------------------------ |
| 中文（默认） | `/`、`/about/`、`/posts/`…          | `content/**`    | `src/i18n/ui.ts` 的 `zh` |
| 英文         | `/en/`、`/en/about/`、`/en/posts/`… | `content/en/**` | `src/i18n/ui.ts` 的 `en` |

- 界面文案、导航菜单、日期格式、阅读时长、RSS 标题都按当前 URL 的语言自动切换
- 页头的语言按钮会跳转到“当前这一页”的另一种语言；文章与笔记的中英文件保持同名，标签页则通过标签文件的 `translation` 字段互相指向
- 页面会输出 `hreflang`（zh-CN / en-US / x-default）与分语言的 `canonical`，sitemap 里也会带 `xhtml:link` 语言互指
- 每种语言各有一个 RSS：`/rss.xml`、`/notes/rss.xml`、`/en/rss.xml`、`/en/notes/rss.xml`
- OG 图片按语言分开生成：`/og-image/<slug>.png` 与 `/og-image/en/<slug>.png`
- 新增语言需要：在 `src/i18n/ui.ts` 增加字典与 `htmlLang`/`ogLocale`，在 `src/content.config.ts` 增加对应的 collection，再复制一份 `src/pages/en/` 路由

## 目录约定速查

- 中文文章 `content/posts/hello-world.md` ↔ 英文文章 `content/en/posts/hello-world.md`（**文件名保持一致**，切换语言才能落到同一篇）
- 中文标签 `content/tags/随笔.md` 里的 `translation: "essay"` 指向英文标签，英文标签文件里反向指向 `随笔`

## 自定义站点信息

作者、域名与导航菜单集中在 `src/site.config.ts`；导航项只写路径，标题由 `src/i18n/ui.ts` 中对应的 `nav.*` 文案提供。
站点标题、描述、日期格式等按语言的文案都在 `src/i18n/ui.ts`。

正式域名已配置为 `https://blog.luxstarspace.com/`，定义在 `src/site.config.ts` 的 `siteConfig.url`。
`wrangler.jsonc` 不需要域名，但 Worker 名称 `name` 决定了默认的 `*.workers.dev` 回退地址。

社交链接在 `src/components/SocialList.astro`。

## 写文章

在 `content/posts/` 下新建 `.md` 或 `.mdx` 文件：

```yaml
---
title: "文章标题"
description: "用于列表和 SEO 的描述"
publishDate: "2026-09-23"
tags: ["随笔"]
draft: false
---
```

- `draft: true` 的文章不会进入构建产物
- 短笔记放在 `content/notes/`，字段只需要 `title` 和 `publishDate`（时间需要带时区的 ISO 8601 格式，如 `2026-09-23T10:55:00+08:00`）
- 标签页参考 `content/tags/` 下的示例文件
- 需要英文版本时，在 `content/en/` 下的同名目录新建同名文件

## 部署到 Cloudflare Workers

仓库已包含 `.github/workflows/deploy.yml`，push 到 `main` 时自动构建并部署。

需要在 GitHub 仓库的 Settings → Secrets and variables → Actions 中配置两个 secret：

| Secret 名称             | 说明                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare API Token，权限需包含 `Workers Scripts: Edit` 与 `Account Settings: Read` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID，可在 Dashboard 右侧栏或 `wrangler whoami` 查看                   |

配置完成后 push 到 `main` 即可自动部署。

- 正式地址：`https://blog.luxstarspace.com`
- 回退地址：`https://tianye-blog.<你的子域>.workers.dev`

### 手动部署

```bash
pnpm build
pnpm wrangler deploy
```

`wrangler deploy` 需要先执行 `pnpm wrangler login` 完成授权。

### 绑定自定义域名

在 Cloudflare Dashboard → Workers & Pages → `tianye-blog` → Settings → Domains & Routes 添加 `blog.luxstarspace.com`。
需要先确保 `luxstarspace.com` 的 DNS 托管在同一 Cloudflare 账户，并删除该子域已存在的同名记录。

详细步骤见 [`docs/cloudflare-deploy.md`](docs/cloudflare-deploy.md)。修改域名后 `siteConfig.url` 必须同步更新并重新部署，否则 sitemap、RSS 和 OG 图片的绝对地址会出错。

## 自动化科技速览（`worker/digest`）

仓库里还包含一个独立的 Cloudflare Worker `tianye-digest`：定时抓取公开技术信息源，用 Gemini 汇总成中英双语摘要，再提交回本仓库，由 `deploy.yml` 自动重建上线。

| 系列 | 频率 | 来源 |
| --- | --- | --- |
| HN 热榜 | 每 5 小时 | Hacker News |
| 日报 | 每天 09:00（CST） | Vite / React、GitHub 热榜、Python 官方文档与 PEP、Reddit |
| 周报 | 每周一 10:00（CST） | HelloGitHub、Koala 聊开源 |
| Pi 版本解读 | 每 3 小时 | [pi.dev/changelog](https://pi.dev/changelog)（逐版本读 release 页面） |

生成的文章带上 `速览` / `digest` 标签（中英各一组），位于 `content/posts/` 与 `content/en/posts/`，因此也能在标签页里浏览：`/tags/速览/`。

使用前需要自己填三个密钥（Gemini API Key、带 `Contents: write` 的 GitHub PAT、手动触发 token），完整说明见 [`worker/digest/README.md`](worker/digest/README.md)。

```bash
cd worker/digest
pnpm exec wrangler secret put GEMINI_API_KEY
pnpm exec wrangler secret put GITHUB_TOKEN
pnpm exec wrangler secret put TRIGGER_TOKEN
pnpm exec wrangler deploy
```

## 注意事项

- `dist/`、`node_modules/`、`.env` 不提交
- Pagefind 对中文不支持词干提取，搜索仍可用但不会做跨词根匹配；搜索界面文案会跟随页面 `lang` 自动切换
- 主题署名链接（页脚）请按原主题许可保留
