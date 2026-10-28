# Shorts Tracker

A personal tracker for daily habits, a YouTube Shorts pipeline and real work hours. It is an installable web app (PWA): no build step, no framework, just static files.

- **Today**: 5 daily tasks, streak, work timer, habits, clip of the day.
- **Time**: start/pause/finish timer, categories, weekly hours, daily target, sessions you can edit.
- **Clips**: library of YouTube links, marked used automatically.
- **Shorts**: make and schedule Shorts, 48-hour numbers, 7-day check.
- **Progress**: stats, habits, and a one-year view.
- **More**: sync, settings, backup, reset.

## Run it

Open `index.html` through any static server, or use GitHub Pages (below). Data is saved in the browser first, so it works offline.

## Publish on GitHub Pages

Repo **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save.**
The app is then at `https://<your-username>.github.io/<repo-name>/`.

## Install on iPhone

Open the Pages link in **Safari → Share → Add to Home Screen**.

## Turn on cloud sync (optional)

1. Create a free project at supabase.com.
2. **SQL Editor → New query**, paste `supabase.sql`, **Run**.
3. **Authentication → Providers → Email**: turn off **Confirm email** (simplest for one person).
4. **Project Settings → API**: copy the **Project URL** and the **anon public** key into `config.js`, commit and push.
5. Open the app → **More → Sync and account → Create account**.
6. After you have signed up on your devices, go to **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**, so nobody else can create accounts.

The anon key is designed to be public. Row-level security (in `supabase.sql`) makes each row readable and writable only by its owner.

## How data is stored

One `docs` table, one row per document: `meta` (settings, habits, categories, timer), `clips`, and one `m-YYYY-MM` row per month (days, Shorts, work sessions). The newest write wins per document. Use **More → Save a backup file** for your own copy.
