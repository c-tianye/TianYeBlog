---
title: "科技速览 · 日报 2026-11-23"
description: "本期科技速览关注 PostgreSQL 19 正式发布、谷歌推出 Agent Compute Engine AI 隔离运行环境，以及 Claude Code 本地凭据泄露等核心技术动态。"
publishDate: "2026-11-23T09:00:00+08:00"
tags: ["速览","日报"]
draft: false
---

## 概览

本期重点关注数据库与 AI Agent 安全基础设施的发展。PostgreSQL 19 迎来重大版本更新，同时谷歌与 Claude 在 AI Agent 的隔离运行和密钥安全方面带来了最新的实践与警示。

## 重点

### [PostgreSQL 19 Released with Online Table Repacking and Query Planning Controls](https://www.infoq.com/news/2026/11/postgresql-19-released/?utm_campaign=infoq_content&utm_source=infoq&utm_medium=feed&utm_term=global)

PostgreSQL 19 正式发布，引入了在线表重打包和查询计划控制等多项功能。该版本专注于降低数据库运维开销，同时改善了复制性能与应用开发体验。

### [Google Announces Agent Compute Engine for Secure AI Agent Execution](https://www.infoq.com/news/2026/11/google-agent-compute-engine/?utm_campaign=infoq_content&utm_source=infoq&utm_medium=feed&utm_term=global)

谷歌推出了托管服务 Agent Compute Engine，通过在隔离的微型虚拟机（microVM）中运行 AI Agent 并支持挂起与恢复执行，以此保护凭据和执行环境安全。

### [Claude Code Has Been Leaking Secrets through its "Don't Ask Again" Feature](https://www.infoq.com/news/2026/11/claude-code-leaking-secrets/?utm_campaign=infoq_content&utm_source=infoq&utm_medium=feed&utm_term=global)

安全研究机构 Apiiro 发现，Claude Code 的“不再询问”功能在开发者本地存储密钥的方式存在隐患，导致大量敏感凭据泄露到了公共代码库中。

### [QCon San Francisco 2026: The Harness Is the New Operating System](https://www.infoq.com/news/2026/11/harness-new-operating-system/?utm_campaign=infoq_content&utm_source=infoq&utm_medium=feed&utm_term=global)

在 QCon SF 2026 上，Mad Labs 创始人提出围绕 AI 模型构建的控制框架（Harness）比模型本身更能决定 Agent 的能力边界与安全水平。

## 其他

- [GitHub Actions accepts invalid YAML](https://yossarian.net/til/post/github-actions-accepts-invalid-yaml/) —— 探讨了 GitHub Actions 运行解析器在接收非标准 YAML 配置时的宽松行为。
- [Binding of Isaac developer removes AI music from Repentance Plus](https://www.theverge.com/games/1039770/binding-of-isaac-ai-music) —— 游戏开发者在引发玩家抵制后，移除了扩展包中由 AI 生成的音乐轨道。
- [We haven’t seen the last of the major tech outages](https://www.theverge.com/tech/1039851/major-tech-outages) —— 分析了近期多起大规模系统故障背后的技术债务与基础设施隐患。
- [NixOS bring-up on an Alibaba RISC-V board](https://feyor.sh/blog/nixos-bringup-on-an-alibaba-riscv-board/) —— 记录了将 NixOS 系统成功移植并运行在阿里巴巴 RISC-V 开发板上的技术细节。
- [Researcher plants 2m canaries into the AI supply chain. A privacy disaster surfaced](https://arstechnica.com/security/2026/11/a-leaky-ai-supply-chain-is-exposing-secret-user-data-at-an-alarming-rate/) —— 研究人员通过金丝雀测试揭示了 AI 供应链中严重的数据与隐私泄露危机。

## 小结

基础架构的稳定维系与 AI Agent 运行环境的安全隔离正在成为当前技术演进的关键议题。

---

**本期来源**（共 21 条）：[工程与技术社区](https://lobste.rs/)（10） · [科技商业动态](https://techcrunch.com/)（11）

抓取时间：2026-11-23 09:00（CST），由 Cloudflare Worker 定时抓取、Gemini 汇总生成。
英文版见 [English version](https://blog.luxstarspace.com/en/posts/digest-daily-20261123/)。
