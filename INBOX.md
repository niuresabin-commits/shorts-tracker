# Clip agent inbox

A separate, write-only drop box that another program (the "Clip" agent) uses to hand things to the tracker.
Nothing in it reaches the tracker until you tap **Accept** on the card that appears on **Today**.

- Table: `public.inbox` (created by `supabase-inbox.sql`; your tracker data table `docs` is not touched)
- The agent has **its own Supabase login**. That login can only **add new rows** to the inbox. It cannot read, change or delete anything, and it is locked out of `docs`.
- In the tracker: Today shows **"N new items from Clip"** with **Accept** and **Dismiss** on every item.

## One-time setup (you)

1. Supabase -> Authentication -> Users -> **Add user** -> make a login for the agent (tick *Auto Confirm User*).
2. Supabase -> SQL Editor -> paste `supabase-inbox.sql`, change the two emails at the top, **Run**.
3. Put these in the agent repo's **GitHub Secrets** (names only here, never values):

| Secret name | What it is |
|---|---|
| `SUPABASE_URL` | the project URL (also in `config.js`) |
| `SUPABASE_ANON_KEY` | the public key (also in `config.js`) |
| `CLIP_AGENT_EMAIL` | the email of the agent login from step 1 |
| `CLIP_AGENT_PASSWORD` | that login's password |

## How the agent sends an item

```bash
# 1) sign in as the agent (the token lasts about an hour; sign in again when needed)
TOKEN=$(curl -s "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$CLIP_AGENT_EMAIL\",\"password\":\"$CLIP_AGENT_PASSWORD\"}" | jq -r .access_token)

# 2) add ONE item per request
curl -s -o /dev/null -w "%{http_code}\n" "$SUPABASE_URL/rest/v1/inbox" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{"kind":"clip","key":"ZcOoUdZRo-c","payload":{"vid":"ZcOoUdZRo-c","label":"Diner scene","link":"https://youtu.be/ZcOoUdZRo-c?t=75","why":"Strong reaction in 2 seconds","emotion":"shock","suggested_on":"2026-11-18"}}'
```

| Answer | Meaning |
|---|---|
| `201` | added |
| `409` | the same `key` was already delivered for this `kind` (also true if you already dismissed it). Treat as done. |
| `403` | not allowed (wrong login, or you tried to set `status`/another `user_id`) |
| `400` | invalid (`kind` must be `clip` or `views`, `key` 1-300 characters, `payload` a JSON object under 8,000 characters) |

Do **not** send `Prefer: return=representation` or `on_conflict` (the agent has no read permission). `user_id` is filled in automatically; `status` starts as `new`.
`key` is your de-duplication key: one row per `(user, kind, key)`.

## `kind: "clip"` - a clip idea

`payload`: `{ vid, label, link, why, emotion, suggested_on }`

- `vid` the 11-character YouTube video id (or give only `link`). `link` may carry a start time (`?t=75`), which is kept.
- **Accept** adds it to the tracker's clips (label, a note made of why / feeling / suggested day, start time). It is **skipped if that `vid` is already in the clips**.
- Suggested `key`: the `vid`.

## `kind: "views"` - numbers for a published Short

`payload`: `{ title, published_at, pd, pt, stage, views, avg_view_pct, avg_view_seconds, duration_s, subs_gained }`

- `stage` is `"48h"` or `"7d"`. `pd` is the publish date `YYYY-MM-DD` and `pt` the time `HH:MM` (your local time; if `pd` is missing it is worked out from `published_at`).
- The tracker matches the Short by **title + `pd`**. If the title differs, it falls back to the same date + time, otherwise you pick the Short from a list.
- The card shows **your numbers next to Clip's**. Nothing is overwritten without you tapping **Accept and replace mine**.
- `48h` fills the Short's 48-hour numbers (views, viewed %, average seconds, length, new subs). `7d` fills the 7-day check (views, viewed %) and needs the 48-hour numbers to exist first.
- Suggested `key`: `<pd>|<title>|<stage>`.
- Fields you leave out never erase what is already in the tracker.
