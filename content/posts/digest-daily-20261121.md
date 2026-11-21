---
title: "科技速览 · 日报 2026-11-21"
description: "本期聚焦《GTA VI》首日吸金 37.9 亿美元创历史新高、AI 供应链严重泄露用户隐私、Google 首页大改版移除经典搜索按钮，以及 Nginx/Ruby/PHP 集中曝出的高危远程代码执行漏洞。"
publishDate: "2026-11-21T09:00:00+08:00"
tags: ["速览","日报"]
draft: false
---

## 概览

本期科技动态涵盖多项重磅事件：游戏史迎来空前纪录，《GTA VI》首日狂揽近 38 亿美元营收；同时，针对 AI 供应链的数据安全实验揭露了令人担忧的隐私漏洞。此外，互联网基础技术栈（包括 Nginx、Ruby 和 PHP）近期接连曝出可导致远程代码执行的严重安全缺陷，Google 搜索首页也迎来了彻底 AI 化的历史性重构。

## 重点

### [Rockstar says GTA VI made $3.79 billion in its first day](https://www.theverge.com/games/1036279/gta-vi-sales)

Rockstar Games 宣布《GTA VI》首日销售额达到 37.9 亿美元，预售量达 3250 万份，刷新了所有娱乐媒介有史以来的首日收入纪录。

### [Researcher plants 2m canaries into the AI supply chain. A privacy disaster surfaced.](https://arstechnica.com/security/2026/11/a-leaky-ai-supply-chain-is-exposing-secret-user-data-at-an-alarming-rate/)

安全研究团队通过向主流 AI 链条植入 200 万个数字标记测试敏感数据流向，结果发现庞大而复杂的 AI 服务供应链存在严重的数据泄漏问题，用户隐私数据正被普遍暴露。

### [Google rolls out new search homepage with AI chat history and no search button](https://arstechnica.com/ai/2026/11/googles-latest-search-page-redesign-drops-the-search-button-adds-ai-sidebar/)

Google 搜索主页迎来重大改版，移除了存在数十年的经典搜索按钮并引入 AI 对话侧边栏与历史记录，标志着传统搜索引擎向生成式 AI 交互界面的彻底转型。

### [nginx2root: Five new nginx vulnerabilities, and how Cloudflare protects origins from the worst of them](https://blog.cloudflare.com/nginx2root/)

安全研究人员公开了针对 Nginx 的多项内存破坏漏洞（代号 nginx2root），未授权攻击者可能借此导致工作进程崩溃甚至在服务器上执行任意代码，Cloudflare 发布了相应防护分析与规则。

## 其他

- [How Cloudflare WAF protects against ruby2shell (CVE-2026-132825)](https://blog.cloudflare.com/ruby2shell-waf-protection/) —— Ruby 大小写转换中的堆缓冲区溢出高危漏洞细节与 WAF 防护方案。
- [How Cloudflare WAF helps protect against phpAfterShell and other critical PHP flaws](https://blog.cloudflare.com/phpaftershell-waf-protection/) —— PHP 默认文件 Session 处理器中 CVSS 9.2 分数的远程代码执行漏洞分析。
- [Meta reconsiders 2030 net-zero goal amid record emissions from AI data centers](https://arstechnica.com/ai/2026/11/meta-reconsiders-2030-net-zero-goal-amid-record-emissions-from-ai-data-centers/)
 —— 由于建设 AI 数据中心导致温室气体排放飙升，Meta 正在重新评估 2030 净零排放目标。
- [YouTube is reportedly preparing to settle social media addiction claims for $3 billion](https://www.theverge.com/streaming/1039096/youtube-social-media-addiction-school-districts-settlement) —— YouTube 拟支付 30 亿美元，与指控其产品具有成瘾性并危害青少年的多个学区达成和解。
- [AI claimed a solution to the 167-year-old Riemann hypothesis — and a human did, too](https://techcrunch.com/2026/11/20/ai-claimed-a-solution-to-the-167-year-old-riemann-hypothesis-and-a-human-did-too/) —— 人工智能系统与人类数学家在同个时期分别宣称证明了百年难题黎曼猜想。
- [Levent Alpoge Claims Proof of Riemann Hypothesis](https://alpo.ge/remark.pdf) —— 数学家 Levent Alpoge 发布关于黎曼猜想证明的论文预印本。
- [Trump threatens ‘tremendous tax’ for moving AI data centers outside the US](https://www.theverge.com/policy/1038892/trump-foreign-data-centers-tax) —— 特朗普提议对在境外建设 AI 数据中心的企业征收高额税款。
- [Trump FCC declares California isn't allowed to enforce phone service rules](https://arstechnica.com/tech-policy/2026/11/fcc-orders-california-to-stop-enforcing-phone-service-rules-against-att/) —— FCC 命令加州停止对 AT&T 执行托底运营商电信保障规则。
- [SpaceX's Starshield troubles in Ukraine could threaten its broader military business](https://arstechnica.com/space/2026/11/incoming-house-chair-threatens-spacex-funding-over-ukraine-controversy/) —— 国会情报委员会潜在主席就乌克兰星盾争议威胁削减 SpaceX 政府资金。
- [Announcing jj-musubi: live sync for Jujutsu](https://www.serpentine.com/posts/2026/announcing-jj-musubi/) —— 为新型版本控制系统 Jujutsu 打造的实时协作同步工具发布。
- [Internet Archive Staffers Are Unionizing](https://cwa-union.org/news/releases/internet-archive-workers-launch-union-campaign-communications-workers-america) —— 互联网档案馆员工宣布发起加入 CWA 工会的筹备行动。
- [Removing binder.c](https://lwn.net/Articles/1102982/) —— LWN 讨论 Linux 内核中 Android Binder 驱动的重构与移除规划。
- [Vim Classic 8.3.1 released](https://vim-classic.org/news/vim-8.3.1-released.html) —— 维护分支 Vim Classic 发布 8.3.1 补丁版本。
- [Alice v0.6.0](https://www.alicecaml.org/blog/alice-v0-6-0/) —— OCaml 衍生项目 Alice 发布 v0.6.0 更新。
- [Daniel Ek backs AI researcher’s fusion power startup. Here’s what they’re building.](https://techcrunch.com/2026/11/20/daniel-ek-backs-ai-researchers-fusion-power-startup-heres-what-theyre-building/) —— Spotify 创始人投资由 AI 研究员创办的可控核聚变初创公司 Europa Fusion。
- [Experts warn: Nearly everyone in AI is susceptible to a honey-trap scheme right now](https://techcrunch.com/2026/11/20/experts-warn-nearly-everyone-in-ai-is-susceptible-to-a-honey-trap-scheme-right-now/) —— 专家警告针对 AI 从业者的定向网络钓鱼与社工美人计风险正大幅上升。

## 小结

生成式 AI 的疾速演进正在颠覆传统产品形态与数据安全格局，而底层基建的持续曝险与能耗压力则对工程防御能力提出了更严峻的考验。

---

**本期来源**（共 21 条）：[工程与技术社区](https://lobste.rs/)（9） · [科技商业动态](https://techcrunch.com/)（12）

抓取时间：2026-11-21 09:00（CST），由 Cloudflare Worker 定时抓取、Gemini 汇总生成。
英文版见 [English version](https://blog.luxstarspace.com/en/posts/digest-daily-20261121/)。
