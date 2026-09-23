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

部署成功后访问 `https://tianye-blog.<你的子域>.workers.dev`（`workers.dev` 地址始终可用，作为回退入口）。

> Worker 名称在 `wrangler.jsonc` 的 `name` 字段，当前为 `tianye-blog`。

## 5. 绑定自定义域名 `blog.luxstarspace.com`

`src/site.config.ts` 的 `siteConfig.url` 已设为 `https://blog.luxstarspace.com/`，接下来把域名指向 Worker。

前置条件：`luxstarspace.com` 的 DNS 已托管在同一个 Cloudflare 账户下。如果不在，需先把域名的 nameserver 改到 Cloudflare。

Cloudflare Dashboard → **Workers & Pages** → `tianye-blog` → **Settings** → **Domains & Routes** → **Add** → **Custom Domain**，填入：

```
blog.luxstarspace.com
```

Cloudflare 会自动创建一条指向该 Worker 的 DNS 记录（类型为 `Custom Domain`，代理开启）。生效通常需要几分钟。

也可以用 wrangler 添加：

```bash
pnpm wrangler domains add blog.luxstarspace.com
```

### 验证

```bash
curl -I https://blog.luxstarspace.com/
```

应返回 `200`。再看证书是否签发成功：

```bash
echo | openssl s_client -connect blog.luxstarspace.com:443 -servername blog.luxstarspace.com 2>/dev/null | openssl x509 -noout -subject -dates
```

### 注意

- 如果 `blog` 子域已存在同名 DNS 记录（A / CNAME），需先删除，否则 Custom Domain 无法绑定
- `siteConfig.url` 决定 sitemap、RSS 和 OG 图片里的绝对地址，改域名后必须重新部署才会生效

## 常见问题

**deploy 报 `In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN`**
→ 第 3 步的 secret 没配置，或名字拼写不一致。

**deploy 报 `Authentication error` / `Unable to authenticate`**
→ Token 权限不足，确认包含 `Workers Scripts: Edit`。

**deploy 报 `More than one account available`**
→ `CLOUDFLARE_ACCOUNT_ID` 没配置或值错误。

**构建成功但页面 404**
→ 确认 `wrangler.jsonc` 的 `assets.directory` 指向 `./dist`，且 `pnpm build` 已生成 `dist/index.html`。
