# Field Notes — daily growth page

A personal daily page: one reading with a quiz, a word, a quotation with commentary,
a brain teaser, a reflection prompt, and a live feed of recent items from your field.

Everything except the live feed works offline. The live feed is refreshed once a day
by a scheduled GitHub Action, so the page updates whether or not you visit it.

---

## What's in here

```
index.html                     the page itself
data/live.json                 feed items, rewritten daily by the Action
scripts/fetch-feeds.mjs        the fetcher — edit FEEDS at the top to change sources
.github/workflows/daily.yml    the schedule, the commit, and the deploy
```

## Setting it up (about fifteen minutes, once)

**1. Create the repository.** On GitHub, click **New repository**. Name it anything —
`field-notes` works. Make it **Public** (GitHub Pages is free on public repos; on private
repos it needs a paid plan). Don't add a README, since this folder already has one.

**2. Upload these files.** On the empty repository page, click **uploading an existing file**,
then drag in everything from this folder. Keep the folder structure — if you drag the
whole folder in at once, GitHub preserves it. Commit directly to `main`.

**3. Turn on Pages.** Go to **Settings → Pages**. Under **Source**, choose
**GitHub Actions** (not "Deploy from a branch"). Save.

**4. Allow the Action to commit.** Go to **Settings → Actions → General**, scroll to
**Workflow permissions**, select **Read and write permissions**, and save. Without this,
the daily commit step fails.

**5. Run it once by hand.** Go to the **Actions** tab, pick **Daily update** in the
sidebar, and click **Run workflow**. Give it a minute or two.

**6. Open your page.** It'll be at `https://YOUR-USERNAME.github.io/field-notes/`.
Bookmark it on your phone and laptop.

From then on it runs itself, at roughly 07:00 IST each morning.

## Changing what it fetches

Open `scripts/fetch-feeds.mjs` and edit the `FEEDS` array at the top. Each entry needs
a `name`, an RSS or Atom `url`, and a short `tag` used as a label on the page:

```js
{ name: "Journal of Inclusive Education", url: "https://…/feed", tag: "Research" },
```

Feeds that break or disappear are skipped silently rather than failing the run, so a
dead source degrades the page instead of breaking it. Check the Actions log if an
expected source stops appearing — it prints `ok` or `skip` for each feed.

Good sources to consider adding: Google Scholar alerts (they offer RSS), specific
journal tables of contents, government department feeds, and any newsletter that
publishes an RSS version.

## Changing the content bank

The readings, words, quotations, teasers, and reflection prompts are plain JavaScript
arrays near the top of the `<script>` block in `index.html`. Adding an entry means
copying the shape of the one above it. Each bank rotates independently by day number,
so the combinations keep recombining as the banks grow.

## A note on your reflections

Notes are saved in your browser's storage on the device where you wrote them. They are
not uploaded anywhere and are not synced between devices — which is good for privacy
and bad for backup. If a note matters, copy it somewhere durable.
