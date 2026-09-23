# Cloudflare 部署配置步骤

CI 流水线已就绪，只差 Cloudflare 凭据。完成以下步骤后 push 到 `main` 即可自动部署。

## 1. 创建 Cloudflare API Token

Cloudflare Dashboard → 右上角头像 → **My Profile** → **API Tokens** → **Create Token** → **Create Custom Token**

权限设置：

| 类型 | 权限 | 级别 |
| --- | --- | --- |
| Account | Workers Scripts | Edit |
| Account | Account Settings | Read |
| User | User Details | Read |

- **Account Resources**：Include → 你的账户
- **Zone Resources**：可留空（绑定自定义域名时再单独处理）

创建后**立刻复制 Token**，页面关闭后无法再次查看。

## 2. 获取 Account ID

Cloudflare Dashboard → **Workers & Pages** → 右侧栏 **Account ID**。

或本地执行：

```bash
pnpm wrangler whoami
```

## 3. 配置 GitHub Secrets

仓库 `c-tianye/TianYeBlog` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

添加两个：

| Name | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | 第 1 步复制的 Token |
| `CLOUDFLARE_ACCOUNT_ID` | 第 2 步的 Account ID |

## 4. 触发部署

配置完成后重新运行失败的工作流：

```bash
gh run rerun 35809530164 --repo c-tianye/TianYeBlog
```

或者随便 push 一个 commit。也可以手动触发：

```bash
gh workflow run deploy --repo c-tianye/TianYeBlog
```

部署成功后访问 `https://tianye-blog.<你的子域>.workers.dev`。

> Worker 名称在 `wrangler.jsonc` 的 `name` 字段，当前为 `tianye-blog`。

## 5. 绑定自定义域名（可选）

Cloudflare Dashboard → **Workers & Pages** → `tianye-blog` → **Settings** → **Domains & Routes** → **Add** → **Custom Domain**。

绑定后需要同步更新 `src/site.config.ts` 的 `siteConfig.url` 为正式域名，否则 sitemap、RSS 和 OG 图片里的绝对地址会指向 `workers.dev`：

```ts
url: "https://your-domain.com/",
```

然后重新部署。

## 常见问题

**deploy 报 `In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN`**
→ 第 3 步的 secret 没配置，或名字拼写不一致。

**deploy 报 `Authentication error` / `Unable to authenticate`**
→ Token 权限不足，确认包含 `Workers Scripts: Edit`。

**deploy 报 `More than one account available`**
→ `CLOUDFLARE_ACCOUNT_ID` 没配置或值错误。

**构建成功但页面 404**
→ 确认 `wrangler.jsonc` 的 `assets.directory` 指向 `./dist`，且 `pnpm build` 已生成 `dist/index.html`。
