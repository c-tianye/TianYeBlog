---
title: "你好，世界"
description: "这个博客的第一篇文章，说明它是什么以及后续会写什么。"
publishDate: "2026-09-23"
tags: ["随笔"]
---

这是一个基于 [Astro Cactus](https://github.com/chrismwilliams/astro-theme-cactus) 主题搭建的静态博客，部署在 Cloudflare Workers 上。

## 为什么写博客

把工程实践里的决策、踩坑和验证过程写下来，一是方便自己回头查阅，二是让结论可以被他人复用。所以这里的内容会尽量带上完整的命令、配置和结果，而不是只给结论。

## 后续会写什么

- 工程实践与工具链配置
- 遇到的具体问题和排查过程
- 一些长期思考的整理

## 文章写法

文章放在 `content/posts/` 下，支持 Markdown 与 MDX。Frontmatter 字段：

```yaml
---
title: "文章标题"
description: "用于列表和 SEO 的描述"
publishDate: "2026-09-23"
tags: ["标签一", "标签二"]
draft: false
---
```

`draft: true` 的文章不会出现在构建产物中。短笔记放在 `content/notes/` 下，字段更少，只需要 `title` 和 `publishDate`。英文内容放在 `content/en/` 下的同名目录里。
