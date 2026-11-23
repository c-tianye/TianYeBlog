---
title: "Tech Digest · Daily 2026-11-23"
description: "This issue highlights the release of PostgreSQL 19, Google's Agent Compute Engine for secure AI execution, and secret leakage risks in developer AI tools."
publishDate: "2026-11-23T09:00:00+08:00"
tags: ["digest","daily"]
draft: false
---

## Overview

This issue covers significant developments in database systems and security architectures for AI agents. As PostgreSQL 19 brings lower maintenance overhead, modern cloud environments are adapting to address isolation and secret leakage risks in AI workflows.

## Highlights

### [PostgreSQL 19 Released with Online Table Repacking and Query Planning Controls](https://www.infoq.com/news/2026/11/postgresql-19-released/?utm_campaign=infoq_content&utm_source=infoq&utm_medium=feed&utm_term=global)

PostgreSQL 19 introduces online table repacking and enhanced query planning controls. The release focuses on reducing overall database administration overhead while refining replication and application workflows.

### [Google Announces Agent Compute Engine for Secure AI Agent Execution](https://www.infoq.com/news/2026/11/google-agent-compute-engine/?utm_campaign=infoq_content&utm_source=infoq&utm_medium=feed&utm_term=global)

Google launched Agent Compute Engine, a managed platform running AI agents inside isolated microVMs with state checkpointing to protect system credentials.

### [Claude Code Has Been Leaking Secrets through its "Don't Ask Again" Feature](https://www.infoq.com/news/2026/11/claude-code-leaking-secrets/?utm_campaign=infoq_content&utm_source=infoq&utm_medium=feed&utm_term=global)

Security firm Apiiro revealed that Claude Code has exposed sensitive secrets in public repositories due to how its local "Don't Ask Again" file storage is handled.

### [QCon San Francisco 2026: The Harness Is the New Operating System](https://www.infoq.com/news/2026/11/harness-new-operating-system/?utm_campaign=infoq_content&utm_source=infoq&utm_medium=feed&utm_term=global)

At QCon SF 2026, Mad Labs' CEO argued that the harness wrapping an AI model plays a far greater role than the model itself in dictating agent capabilities and safety.

## Also worth reading

- [GitHub Actions accepts invalid YAML](https://yossarian.net/til/post/github-actions-accepts-invalid-yaml/) — Examines permissive parsing behaviors inside GitHub Actions when encountering malformed YAML files.
- [Binding of Isaac developer removes AI music from Repentance Plus](https://www.theverge.com/games/1039770/binding-of-isaac-ai-music) — Developers pulled AI-generated audio assets following community pushback on Steam.
- [We haven’t seen the last of the major tech outages](https://www.theverge.com/tech/1039851/major-tech-outages) — Discusses systemic reliability challenges behind recent widespread IT system failures.
- [NixOS bring-up on an Alibaba RISC-V board](https://feyor.sh/blog/nixos-bringup-on-an-alibaba-riscv-board/) — Documents the technical process of bringing up NixOS on Alibaba RISC-V hardware.
- [Researcher plants 2m canaries into the AI supply chain. A privacy disaster surfaced](https://arstechnica.com/security/2026/11/a-leaky-ai-supply-chain-is-exposing-secret-user-data-at-an-alarming-rate/) — A massive canary study uncovers alarming rates of sensitive user data exposure across AI pipelines.

## Takeaway

Strengthening core infrastructure while establishing safe execution boundaries for AI tools has become paramount for modern engineering.

---

**Sources** (21 items): [Engineering & tech community](https://lobste.rs/)（10） · [Tech business](https://techcrunch.com/)（11）

Collected 2026-11-23 09:00 CST by a Cloudflare Worker, summarised by Gemini.
Machine-generated digest — the [Chinese version](https://blog.luxstarspace.com/posts/digest-daily-20261123/) may read better.
