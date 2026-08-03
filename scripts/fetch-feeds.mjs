/**
 * Fetches the latest items from a list of RSS/Atom feeds and writes them to
 * data/live.json. Runs on a schedule via GitHub Actions.
 *
 * No dependencies — uses Node's built-in fetch and a small regex parser,
 * which is sufficient for well-formed RSS and keeps the workflow fast.
 *
 * To change what gets fetched, edit FEEDS below. Nothing else needs changing.
 */

import { writeFile, mkdir } from "node:fs/promises";

const FEEDS = [
  {
    name: "UN Disability News",
    url: "https://social.desa.un.org/issues/disability/feed",
    tag: "Policy",
  },
  {
    name: "PIB — Social Justice & Empowerment",
    url: "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3",
    tag: "India",
  },
  {
    name: "Times Higher Education",
    url: "https://www.timeshighereducation.com/feeds/news",
    tag: "Higher Ed",
  },
  {
    name: "Inside Higher Ed",
    url: "https://www.insidehighered.com/rss.xml",
    tag: "Higher Ed",
  },
  {
    name: "BMJ Open — latest research",
    url: "https://bmjopen.bmj.com/rss/current.xml",
    tag: "Research",
  },
];

const MAX_PER_FEED = 4;
const MAX_TOTAL = 14;
const TIMEOUT_MS = 15000;

// ---------- tiny RSS/Atom parser ----------

function decodeEntities(str = "") {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pick(block, tags) {
  for (const tag of tags) {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
    if (m && m[1].trim()) return decodeEntities(m[1]);
  }
  return "";
}

function pickLink(block) {
  const plain = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  if (plain && plain[1].trim()) return decodeEntities(plain[1]);
  const atom = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return atom ? atom[1] : "";
}

function parseFeed(xml) {
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/\1>/gi) || [];
  return blocks.map((b) => ({
    title: pick(b, ["title"]),
    summary: pick(b, ["description", "summary", "content"]).slice(0, 260),
    link: pickLink(b),
    published: pick(b, ["pubDate", "published", "updated", "dc:date"]),
  }));
}

// ---------- fetching ----------

async function fetchFeed(feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { "User-Agent": "field-notes-daily/1.0 (+github actions)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const items = parseFeed(xml)
      .filter((i) => i.title && i.link)
      .slice(0, MAX_PER_FEED)
      .map((i) => ({ ...i, source: feed.name, tag: feed.tag }));
    console.log(`  ok   ${feed.name} — ${items.length} items`);
    return items;
  } catch (err) {
    // A broken feed must never fail the whole run.
    console.log(`  skip ${feed.name} — ${err.message}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function sortByDate(items) {
  return items.sort((a, b) => {
    const da = Date.parse(a.published) || 0;
    const db = Date.parse(b.published) || 0;
    return db - da;
  });
}

async function main() {
  console.log(`Fetching ${FEEDS.length} feeds…`);
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const items = sortByDate(results.flat()).slice(0, MAX_TOTAL);

  if (items.length === 0) {
    console.log("No items retrieved — leaving existing data/live.json untouched.");
    process.exit(0);
  }

  await mkdir("data", { recursive: true });
  await writeFile(
    "data/live.json",
    JSON.stringify({ updated: new Date().toISOString(), items }, null, 2) + "\n",
    "utf-8"
  );
  console.log(`Wrote data/live.json with ${items.length} items.`);
}

main().catch((err) => {
  console.error("Unexpected failure:", err);
  process.exit(1);
});
