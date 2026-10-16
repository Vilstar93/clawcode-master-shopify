# Two store types

The factory produces two kinds of store. Pick one per client in the config:

```json
"store": { "type": "store" }
```

or

```json
"store": { "type": "landing" }
```

## Type 1 — Full store (`store`)

A complete Shopify storefront: theme, catalog, collections, navigation,
checkout pages, and the legal pages.

**Use when** the client has a real catalog and wants to grow it.

**Output:** `dist/<slug>/` with the products CSV, theme settings, legal pages.

**Checkout:** Shopify's own storefront and cart.

## Type 2 — Landing + Shopify checkout (`landing`)

One conversion page that hands off to Shopify's hosted checkout through a
**cart permalink**. No theme, no catalog browsing, no API token.

**Use when** the client sells one thing, or a handful of things, and needs to
start selling fast. Also good as an ad landing page in front of a full store.

**Output:** `dist/<slug>/landing/` — a static bundle plus one serverless
function.

**Checkout:** `https://<store>.myshopify.com/cart/<variantId>:<qty>`

### Why the permalink approach

- No API token to leak or rotate.
- Nothing to break when the Admin API changes version.
- Shopify owns payment, tax, and order email entirely.
- It is the pattern proven in production by `vzgconsult-online`.

### What a landing store still needs

- A Shopify store with the products in it (for the variant ids).
- The legal pages (they live in the Shopify store, linked from the footer).
- A domain, bought in Shopify.

The landing page is the shop window. Shopify is the till.

## Comparison

| | Full store | Landing |
| --- | --- | --- |
| Theme | Yes | No |
| Catalog browsing | Yes | One page |
| API token | For import | Not needed |
| Time to ship | Longer | Fast |
| Best for | Growing catalogs | One product, or ads |
| Hosting | Shopify | Static host + Shopify checkout |

## Mixed approach

A client can have both. Set `store.type` to `landing` and the build still
produces the full store package alongside the landing bundle, so you can ship
the landing page first and the full store later.

## Config fields that matter for landing

| Field | Why |
| --- | --- |
| `store.domain` | The cart permalink target |
| `store.type` | `landing` |
| `store.heroImage` | Hero image path |
| `brand.logo` | Header logo |
| `products[].variantId` | **Required** for checkout |
| `products[].images` | Card images |
| `shipping.carriers` | Shown in the copy |
| `shipping.freeOver` | Shown in the FAQ |
| `legal.returnDays` | Shown in the FAQ |

Products without a `variantId` are omitted from the checkout and a warning is
printed. Get the id from the Shopify admin after the products exist.
