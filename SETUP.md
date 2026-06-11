# Life OS — Setup & Deploy Guide

All 8 phases + second-night additions are built and committed. Full
requirements: `../REQUIREMENTS.md`.

Second-night additions: bug/UX batch (task editing, optimistic toggles,
touch actions, dialogs, custom kanban stages, vault password change +
encrypted backup + search, week calendar, habit heatmaps, sessions
management, service worker, 18 unit tests), collapsible sidebar sections,
dashboard v2 (weather chip, AI news, drag-drop widgets), accent themes +
Notion-style covers + notes gallery, spreadsheets (/sheets, Univer),
canvas notes with pen support (Excalidraw, per-note Page/Canvas toggle),
apps launcher (/apps, Odoo-style), Playwright sweep script
(`node scripts/e2e-sweep.mjs` against :3100 with BETTER_AUTH_URL set).

## Run locally (works right now)

```bash
# dev database is already running:
#   docker container "lifeos-db" → postgres 16 on localhost:5433
cd ~/personal/life-os
npm run dev          # http://localhost:3000
```

Your account already exists: **irfan@cybrosys.com / test-password-123**
→ change this password in Settings immediately. Signup is closed after this
first account (anyone else hitting /sign-up gets "Registration is closed").

If the DB container is ever stopped: `docker start lifeos-db`.

## Deploy to Vercel (your account — NOT fadilameen's)

The CLI on this machine is logged in as `fadilameen63-6884`. Do this first:

```bash
vercel logout
vercel login          # log in with YOUR account
cd ~/personal/life-os
vercel link           # create new project
```

1. **Database — Neon (free):** Vercel dashboard → Storage → Create → Neon
   Postgres, connect it to the project. It injects `DATABASE_URL`.
2. **Blob storage (note attachments):** Storage → Create → Blob. Injects
   `BLOB_READ_WRITE_TOKEN`.
3. **Env vars** (Project → Settings → Environment Variables):
   - `BETTER_AUTH_SECRET` — generate: `openssl rand -hex 32`
   - `BETTER_AUTH_URL` — your prod URL, e.g. `https://life-os-xxx.vercel.app`
   - `NEXT_PUBLIC_APP_URL` — same prod URL
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — see Gmail below
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — see GitHub below
4. **Push schema to Neon:**
   `DATABASE_URL='<neon url>' npx drizzle-kit push`
5. Deploy: `vercel --prod`
6. Open the URL, **sign up immediately** (first account claims the app), then
   install as PWA on your phone (browser menu → Add to Home Screen).

## Gmail send (worklog reports)

Google Cloud Console → create project → OAuth consent screen (External,
add yourself as test user) → Credentials → OAuth Client ID (Web):
- Authorized redirect URI: `<APP_URL>/api/google/callback`
- Enable the **Gmail API** for the project.
Put client id/secret in env, then Worklog Settings → "Connect Google".
Scopes used: `gmail.send` + `gmail.readonly` (weekly report fetches your sent dailies).

## GitHub (worklog commit suggestions)

GitHub → Settings → Developer settings → OAuth Apps → New:
- Callback URL: `<APP_URL>/api/github/callback`
Put client id/secret in env, then connect from Worklog Settings.

## AI features

Settings → AI: paste your **Gemini** and/or **OpenRouter** keys, pick
provider+model per tier (chat = assistant/insights, fast = capture/
categorization). Keys live server-side only. The vault is hard-excluded
from all AI code paths.

## Module map

| Area | Where |
|---|---|
| Tasks/areas/projects/tags | `/today` `/upcoming` `/inbox`, sidebar |
| Dashboard (widgets, editable) | `/` |
| Worklog (daily/weekly/Odoo/Gmail) | `/worklog*` |
| Notes (BlockNote, nested, AI) | `/notes` |
| Calendar / Events / Habits / Goals | `/calendar` `/events` `/habits` `/goals` |
| Vault (client-side encrypted) | `/vault` |
| Finance | `/finance*` |
| AI assistant / insights | `/assistant` `/insights` |
| Quick add (NL parse + AI capture) | Ctrl/⌘+K anywhere |

## Security notes (already flagged in chat)

- **Revoke the GitHub token** you pasted in chat (`ghp_8cgT…`).
- Change the placeholder login password.
- Vault: PBKDF2-SHA256 600k → AES-256-GCM, encrypted in browser; ciphertext
  only in DB; **no master-password recovery**. Keep using your current
  password manager until you've verified the vault yourself.
- `.env.local` BETTER_AUTH_SECRET is a dev placeholder — never reuse in prod.
