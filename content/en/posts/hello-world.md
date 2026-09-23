---
title: "Hello, World!"
description: "The first post on this blog: what it is and what will be written here."
publishDate: "2026-09-23"
tags: ["essay"]
---

This is a static blog built on the [Astro Cactus](https://github.com/chrismwilliams/astro-theme-cactus) theme and deployed to Cloudflare Workers.

## Why write a blog

Writing down the decisions, dead ends and verification steps of everyday engineering work serves two purposes: I can look them up again later, and the conclusions are reusable by others. So posts here try to include the full commands, configuration and results instead of just the conclusion.

## What will be published here

- Engineering practice and toolchain configuration
- Concrete problems and how they were debugged
- Write-ups of longer-running lines of thought

## How posts are written

Posts live in `content/posts/` and support both Markdown and MDX. The frontmatter fields are:

```yaml
---
title: "Post title"
description: "Description used for listings and SEO"
publishDate: "2026-09-23"
tags: ["tag-one", "tag-two"]
draft: false
---
```

Posts with `draft: true` are excluded from the build output. Short notes live in `content/notes/` with a lighter set of fields — only `title` and `publishDate` are required. English content lives under the same directory names inside `content/en/`.
