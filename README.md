# Flipora Marketplace

Flipora is a Netlify-hosted marketplace with Supabase authentication, listings and storage plus Stripe Checkout and Stripe Connect seller payouts.

## Included

- Responsive public marketplace
- Supabase member accounts, listings, images and order records
- $9.99 lifetime seller membership through Stripe Checkout
- Stripe-hosted seller verification and Express payout dashboard
- Buyer Checkout with a 12% Flipora marketplace fee and an 88% seller transfer
- Signature-verified payment, refund and dispute webhooks
- Administrator fulfillment and refund controls

## Required Netlify environment variables

- `STRIPE_SECRET_KEY` — use a restricted server-side key with only the permissions this integration needs
- `STRIPE_WEBHOOK_SECRET` — signing secret for `https://shop-flipora.netlify.app/.netlify/functions/stripe-webhook`
- `SUPABASE_SECRET_KEY` — server-only Supabase secret key
- `SUPABASE_URL` — Flipora Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` — public browser key
- `SITE_URL` — `https://shop-flipora.netlify.app`

Never commit Stripe or Supabase secret keys or expose them in browser code.

## Database setup

Apply the SQL files in the Supabase SQL editor. `stripe-schema.sql` adds protected order and seller-payment fields plus an atomic purchase-completion function that prevents two buyers from purchasing the same listing.

## Stripe setup

1. Configure Flipora as a Stripe marketplace.
2. Add the webhook endpoint above and subscribe it to Checkout completion/failure/expiration, refund and dispute events.
3. Test seller onboarding, a successful item purchase, a duplicate purchase, a refund and a dispute in Stripe test mode.
4. Switch Netlify to live restricted keys only after the test checklist passes.

## Deploy

The production site deploys automatically from the `main` branch of `romarevgreen-commits/shop-flipora`.

