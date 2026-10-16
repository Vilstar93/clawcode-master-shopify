---
name: shopify-products
description: Generate product titles, descriptions, SEO metadata, and a bulk import CSV. Use when the user wants product copy written, a catalog generated, or products imported in bulk.
---

# Skill: Products and catalog

Writes product copy and produces an importable catalog.

## Trigger

"Write the product descriptions", "generate the catalog", "add these products",
"make the import file".

## Approach

1. Read `config/<client>.json` for products, brand tone, and niche.
2. For each product, generate:
   - `title` — clear, benefit-led, no keyword stuffing
   - `shortDescription` — one sentence
   - `description` — benefits, materials, dimensions, care
   - `tags` — 3-6 searchable terms
   - SEO title (60 chars) and meta description (155 chars)
3. **Batch the work.** Process up to 50 products per model call. Never one
   product per request — that burns tokens for no benefit.
4. Write results back into the config, then run
   `node scripts/gen-products.mjs config/<client>.json`.
5. If the Shopify Admin token is available, run
   `node scripts/import-products.mjs`. The import is idempotent by handle.

## Prompt caching

Keep the system prompt identical across calls (brand guide + tone + format
rules). Only the product data changes. This makes cache hits cheap.

## Rules

- Never invent specifications. If a material or dimension is unknown, leave it
  out and flag it in the handoff.
- Keep the client's language (`config.client.locale`).
- No superlatives the client cannot prove ("best in the world").
