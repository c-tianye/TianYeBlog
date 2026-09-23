import assert from "node:assert/strict";
import { test } from "node:test";
import { clamp, decodeEntities, parseFeed, stripHtml } from "../src/rss.ts";

const RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title><![CDATA[Hello & <world>]]></title>
    <link>https://example.com/a</link>
    <pubDate>Mon, 22 Sep 2026 08:00:00 +0800</pubDate>
    <description><![CDATA[<p>Body text</p>]]></description>
  </item>
  <item>
    <title>Second</title>
    <guid isPermaLink="true">https://example.com/b</guid>
  </item>
</channel></rss>`;

/** Shaped like Reddit's Atom feed, where `<id>` is not a URL and `<link>` carries the href. */
const ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <author><name>/u/someone</name></author>
    <content type="html">&lt;table&gt;&lt;/table&gt;</content>
    <id>t3_abc123</id>
    <link href="https://www.reddit.com/r/technology/comments/abc123/headline/" />
    <updated>2026-09-23T05:12:00+00:00</updated>
    <title>Some headline</title>
  </entry>
</feed>`;

test("parses RSS 2.0 items with CDATA, dates and guid links", () => {
	const items = parseFeed(RSS);
	assert.equal(items.length, 2);
	// markup inside CDATA is stripped so it cannot leak into markdown headings
	assert.equal(items[0]?.title, "Hello &");
	assert.equal(items[0]?.link, "https://example.com/a");
	assert.equal(items[0]?.summary, "Body text");
	assert.equal(items[0]?.date?.toISOString(), "2026-09-22T00:00:00.000Z");
	// falls back to <guid isPermaLink="true">
	assert.equal(items[1]?.link, "https://example.com/b");
});

test("prefers the Atom link href over the entry id", () => {
	const items = parseFeed(ATOM);
	assert.equal(items.length, 1);
	assert.equal(items[0]?.link, "https://www.reddit.com/r/technology/comments/abc123/headline/");
	assert.equal(items[0]?.title, "Some headline");
});

test("drops entries without a usable URL", () => {
	const items = parseFeed(
		"<rss><channel><item><title>x</title><id>t3_y</id></item></channel></rss>",
	);
	assert.equal(items.length, 0);
});

test("helpers decode entities, strip html and clamp", () => {
	assert.equal(decodeEntities("a &amp; b &#39;c&#39; &#x4e2d;"), "a & b 'c' 中");
	assert.equal(stripHtml("<p>hi <b>there</b></p>"), "hi there");
	assert.equal(clamp("abcdef", 4), "abc…");
});
