---
name: shopify-landing
description: Build a single conversion page with Shopify checkout, without a full storefront. Use when the client sells one product or a few, wants an ad landing page, or needs to start selling fast without a theme.
---

# Skill: Landing page with Shopify checkout

Produces a fast conversion page that hands off to Shopify's hosted checkout.

## Trigger

"Build a landing page", "one-page store", "sell one product", "ad landing page",
"we don't need a full store yet".

## How it works

The page posts a product slug to `/api/buy`. The endpoint builds a Shopify
**cart permalink**:

```
https://<store>.myshopify.com/cart/<variantId>:<qty>?properties=<base64>
```

Shopify opens its own checkout. Payment, tax, and order emails are Shopify's.
No API token is involved, so there is no secret to leak.

## Steps

1. Set `store.type` to `landing` in the config.
2. Confirm every product that should be sellable has a `variantId`.
   - If missing, import the products first, then read the variant ids from
     the Shopify admin and add them.
3. Run `node scripts/gen-landing.mjs config/<client>.json`.
4. Inspect `dist/<slug>/landing/index.html` — no `{{placeholders}}` may remain.
5. Deploy `dist/<slug>/landing/` to a static host that supports serverless
   functions (Vercel is the tested one).
6. Set `SHOPIFY_STORE_DOMAIN` in the host environment if the rendered default
   is not the live store.
7. Point the domain at the host. The domain itself is bought in Shopify.

## Rules

- Never add a payment provider to the page. Shopify owns checkout.
- Never store or handle card data. There is nothing to store.
- Products without a `variantId` are silently unsellable — always check.
- Keep the legal pages linked in the footer. They live in the Shopify store.
- Do not introduce a CDN, proxy, or DNS layer. Shopify only.

## Verification

- `grep -c '{{' dist/<slug>/landing/index.html` must be `0`.
- The buy button must reach a real `cart/...` URL for a known slug.
- An unknown slug must return 400, not crash.
