# NIGHTSTRIP

Paid-rank reel feed. Two independent auctions:

- **Casino Row** (gold) — tipsters, sports, casino bonuses
- **Red District** (magenta) — creator teasers, paid Telegram

The feed is SFW. Explicit destinations stay behind **Visitar** and an 18+ gate. NIGHTSTRIP hosts zero porn and processes zero bets. Rank is advertising, not gambling.

Built by [@lalodtc](https://x.com/lalodtc). English UI.

## Product rules

- Ranking is computed **server-side**: `bid DESC`, `created_at ASC`
- Take #1 is **+$5** over the current #1 (or **$10** if the district is vacant)
- Already listed on that side? Pay the **difference**
- **No midnight wipe**. Stay ranked until outbid
- Minimum bid **$10**
- Never trust the client for bid amount or order
- Empty district shows **Take #1 for $10** — no fake listings
- No fake live visitor counts
- Receipts at `/r/[id]`
- Phone: full-screen 9:16 reels, vertical swipe = next rank, horizontal / Casino-Red control = switch district, #1 is first, Visitar is fixed, Take this spot opens a sheet
- Desktop: two-hero **Board** plus ranking rail. The headline number is **Board value**, not standing pot

## Payments

NOWPayments when all three production requirements are set:

- `NOWPAYMENTS_API_KEY`
- `NOWPAYMENTS_IPN_SECRET`
- `DATABASE_URL` (durable Postgres state)

`POST /api/webhooks/nowpayments` verifies `x-nowpayments-sig` (HMAC-SHA512) and is idempotent on `payment_id`.

If any live requirement is missing, the app runs in **demo credit** mode (`+$5,000 demo`) and will not create a crypto invoice. Do not commit secrets.

## Persistence

Set `DATABASE_URL` (Neon / Postgres) for durable production rankings. Without it, local `data/store.json` is used in development; Vercel without a database keeps an ephemeral `/tmp` store and live payments stay disabled.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

```bash
npm test
npm run build
```

## Deploy

Push `main` to GitHub and import the repo on Vercel. Add env vars in the Vercel project. Do not put API keys in the repository.
