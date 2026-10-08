# Bridge — Direct file transfer

Scan. Connect. Send. Instant, private, device-to-device file transfer between
your PC and phone — no accounts, no cloud.

- **PC** opens the app and shows a live, short-lived QR code.
- **Android phone** scans it, joins the session, and a direct encrypted
  WebRTC link is established (kick/offer/answer over short-poll signaling).
- Files, photos, documents, text and links move **device-to-device** — the
  server only relays tiny signaling messages, never file data.

## Stack

Next.js 16 (App Router, Node.js runtime) · React 19 · Tailwind CSS 4 ·
WebRTC DataChannels (16 KB chunked streaming with backpressure) ·
Drizzle ORM + Postgres for the shared pairing store (in-memory fallback) ·
PWA installable.

## Develop

```bash
npm install
npm run dev
```

Optionally point `DATABASE_URL` at a Postgres database (see `.env.example`);
without it the app runs in in-memory mode. The `bridge_sessions` table is
created automatically on first request.

## Build

```bash
npm run build
npm start
```

## Deploy

Import the repository in Vercel and attach **Storage → Postgres** (or set
`DATABASE_URL`). Full guide: [DEPLOY.md](./DEPLOY.md).

## Legal

Privacy · Terms · Cookies · Refunds are served in-app under `/privacy`,
`/terms`, `/cookies`, `/refund`. Replace the bracketed operator details in
`src/lib/legal-meta.ts` before publishing.
