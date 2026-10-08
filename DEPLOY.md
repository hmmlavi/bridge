# Deploying Bridge to Vercel

## 1. Push the repo and import

Push to GitHub/GitLab, then in Vercel: **Add New → Project → Import**. Framework is auto-detected (Next.js). No build-command overrides are needed (`next build` / default output).

## 2. Add a database (strongly recommended)

Pairing state is shared through Postgres so that it works across Vercel's
serverless instances. Without it the app falls back to in-memory state, which
only works while a single instance happens to serve every request — pairing
will be flaky. Set this up before your first deploy:

1. In your project: **Storage → Create Database → Postgres** (Neon).
2. Vercel injects `POSTGRES_URL` (and friends) automatically — the app reads
   both `POSTGRES_URL` and `DATABASE_URL`, so nothing else is required.
   Using an external Postgres (Neon/Supabase/RDS) instead? Just add
   `DATABASE_URL=postgresql://…` under **Settings → Environment Variables**.
   SSL is enabled automatically for non-local hosts.
3. Redeploy. The app creates the `bridge_sessions` table itself on first
   request (`CREATE TABLE IF NOT EXISTS`) — no migration step needed.

Verify: open `/api/health` — it reports `{ ok: true, driver: "postgres" }`.

## 3. Environment variables

| Variable      | Required | Notes                                                        |
| ------------- | -------- | ------------------------------------------------------------ |
| `POSTGRES_URL` or `DATABASE_URL` | Recommended | Auto-set by Vercel Postgres. Required for reliable pairing. |
| `DATABASE_URL` | No (local only) | Only needed for `next dev` / self-hosting; the committed `.env` is for local development and is not used by Vercel builds. |

No other secrets exist in the app — there is nothing else to configure.

## 4. How the app maps onto Vercel

- **Client** (`/` and `/join/[id]`): static/dynamic Next.js pages.
- **Signaling** (`/api/sessions/*`): Node.js serverless functions using
  short polling (no WebSockets, no SSE) — fully compatible with function
  timeouts and multi-instance routing. Typical cost: ~1 request per 1.1 s per
  device while pairing, 1 per 5 s while connected. Well within free-tier limits
  for personal use.
- **Files themselves never touch Vercel** — they move over an encrypted
  WebRTC data channel between the two devices (STUN only for path discovery).
- `vercel.json` pins `regions: ["iad1"]` to match your current deployment —
  change it to the region nearest to you (or delete the key for the default).

## 5. PWA

`manifest.webmanifest`, `sw.js` (network-only), and icons are served from
`/public` and work out of the box over Vercel's HTTPS.

## 6. Local development

```bash
npm install
npx drizzle-kit push   # optional — table auto-creates on first request too
npm run dev
```

Requires Postgres locally (see `.env`) or it falls back to in-memory mode.
