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
- An empty district shows one clearly marked **SPONSORED** house card with **$0 Founder credit**; it never counts as a paid bid, Board value, or pot contribution
- The first real **$10** listing replaces that district's house card; ranks #2–#10 remain empty until real buyers fill them
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

Demo credits (`+$5,000 demo`) are available only in local development. Vercel Preview is read-only; Production fails closed when a required secret is missing. Do not commit secrets.

## Founder house cards

`THE HOUSE` and `THE OTHER SIDE` are NIGHTSTRIP-owned presentation inventory. Their original media lives in `public/media`; neither card links to a third party. Both open the real Take #1 sheet for their own district at the normal $10 minimum.

Do not replace a house card with a real creator, capper, brand, clip, or likeness without written permission from that party. A future approved replacement must remain labeled **SPONSORED** and must not be recorded as paid auction revenue unless an actual verified payment occurred.

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
