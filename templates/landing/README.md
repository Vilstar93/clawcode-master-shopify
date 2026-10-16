# Landing + Shopify checkout template

The second store type. Instead of a full storefront, it is a single conversion
page that hands off to Shopify's hosted checkout.

Use it when the client sells one thing, or a handful of things, and does not
need a full catalog. It is faster to ship and cheaper to run than a full store.

## How the checkout works

No API token. The page posts a slug to `/api/buy`, which builds a **Shopify
cart permalink**:

```
https://<store>.myshopify.com/cart/<variantId>:<qty>?properties=<base64>
```

Shopify opens its own hosted checkout. Payment, tax, and order emails are all
Shopify's. This is the pattern proven in production by `vzgconsult-online`.

Why it matters: no secret to leak, no token to rotate, nothing to break when
the API changes.

## Files

| File | Role |
| --- | --- |
| `index.html.tpl` | The page. Placeholders are `{{name}}`. |
| `api/buy.js.tpl` | Checkout endpoint. Renders the cart permalink. |
| `api/_products.js.tpl` | Generated product list, slug to variant id. |
| `vercel.json` | Static hosting config and security headers. |
| `package.json.tpl` | Minimal manifest. |

## Placeholders

`gen-landing.mjs` fills these from the client config:

`slug`, `brandName`, `legalName`, `eik`, `vatId`, `email`, `phone`,
`phoneRaw`, `addressBlock`, `lang`, `storeDomain`, `primaryColor`,
`secondaryColor`, `tagline`, `metaDescription`, `eyebrow`, `headline`,
`subheadline`, `ctaPrimary`, `ctaSecondary`, `heroImg`, `logoImg`,
`uspItems`, `productsTitle`, `productsSub`, `productCards`, `howTitle`,
`howSub`, `howStep1Title`…`howStep3Text`, `faqTitle`, `faqSub`,
`faqItems`, `navProducts`, `navHow`, `navFaq`, `navContact`, `legalTitle`,
`lTerms`, `lPrivacy`, `lWithdrawal`, `lShipping`, `legalRights`,
`buyLoading`, `buyError`, `msgMethodNotAllowed`, `msgUnknownProduct`,
`msgNoVariant`, `msgCheckoutFailed`.

## Prerequisites

Each product needs a `variantId` — the numeric Shopify variant id. Get it from
the Shopify admin (product → variant → the number in the URL), or from the
`productVariants` query after import.

## Deploy

The output is a static folder plus one serverless function. It runs on any host
that supports that shape — Vercel is the tested one. No Cloudflare, no proxy.

```bash
node scripts/gen-landing.mjs config/<client>.json
cd dist/<client>/landing
npx vercel deploy --prod
```

Set `SHOPIFY_STORE_DOMAIN` in the host's environment, or let the rendered
default stand.

## Rules

- Never add a payment provider to the page. Shopify owns checkout.
- Never store card data. There is nothing to store.
- Keep the legal pages linked in the footer. They live in the Shopify store.
