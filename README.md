# 天业 Blog

基于 [Astro Cactus](https://github.com/chrismwilliams/astro-theme-cactus) 主题的个人技术博客，静态构建后部署在 Cloudflare Workers（Static Assets）。

## 技术栈

- Astro 7（静态站点生成）
- Tailwind CSS v4
- Pagefind（站内搜索）
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
  posts/          # 文章（Markdown / MDX）
  notes/          # 短笔记
  tags/           # 标签说明
src/
  site.config.ts  # 站点标题、作者、域名、导航菜单
  components/     # UI 组件
  layouts/        # 页面布局
  pages/          # 路由
  styles/         # 全局样式与设计令牌
public/           # 静态资源（favicon、social card 等）
wrangler.jsonc    # Cloudflare Workers 部署配置
```

## 自定义站点信息

站点标题、作者、描述、语言和导航菜单集中在 `src/site.config.ts`。

正式域名已配置为 `https://blog.luxstarspace.com/`，定义在 `src/site.config.ts` 的 `siteConfig.url`。
`wrangler.jsonc` 不需要域名，但 Worker 名称 `name` 决定了默认的 `*.workers.dev` 回退地址。

社交链接在 `src/components/SocialList.astro`。

## 写文章

在 `content/posts/` 下新建 `.md` 或 `.mdx` 文件：

```yaml
---
title: "文章标题"
description: "用于列表和 SEO 的描述"
publishDate: "2025-01-01"
tags: ["随笔"]
draft: false
---
```

- `draft: true` 的文章不会进入构建产物
- 短笔记放在 `content/notes/`，字段只需要 `title` 和 `publishDate`
- 标签页参考 `content/tags/` 下的示例文件

## 部署到 Cloudflare Workers

仓库已包含 `.github/workflows/deploy.yml`，push 到 `main` 时自动构建并部署。

需要在 GitHub 仓库的 Settings → Secrets and variables → Actions 中配置两个 secret：

| Secret 名称 | 说明 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token，权限需包含 `Workers Scripts: Edit` 与 `Account Settings: Read` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID，可在 Dashboard 右侧栏或 `wrangler whoami` 查看 |

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

## 注意事项

- `dist/`、`node_modules/`、`.env` 不提交
- Pagefind 对中文不支持词干提取，搜索仍可用但不会做跨词根匹配
- 主题署名链接（页脚）请按原主题许可保留
