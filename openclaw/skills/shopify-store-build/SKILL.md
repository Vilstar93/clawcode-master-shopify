---
name: shopify-store-build
description: Build a complete Shopify store from a single client config. Use when the user asks to create, scaffold, or launch a new Shopify store, or provides a filled client config and wants a working store.
---

# Skill: Full store build

Turns `config/<client>.json` into a complete, payment-ready Shopify store.

## Trigger

The user says something like "build a store for X", "create the store from this
config", or hands you a filled `config/*.json`.

## Inputs

- `config/<client>.json` — validated against `config/client.schema.json`
- `clients/<slug>/` — logo, product images, brand assets

## Steps

Follow `playbooks/00-full-store-build.md`. Summary:

1. **Intake** — read the config. Run `node scripts/validate-config.mjs`.
   If invalid, list every problem and stop. Do not guess missing values.
2. **Scaffold** — run `node scripts/build-store.mjs`. This produces
   `dist/<slug>/` with products CSV, legal pages, theme settings, manifest.
3. **Theme** — confirm `theme/` is populated. If empty, tell the human to run
   the Dawn subtree command. Then `node scripts/push-theme.mjs` (unpublished).
4. **Products** — if the Shopify Admin token is present, run
   `node scripts/import-products.mjs`. Otherwise hand the human `products.csv`
   for manual import.
5. **Legal** — legal pages are generated as DRAFT. Flag them for human review.
6. **Commerce** — walk the human through payment, shipping, and tax setup in
   the Shopify admin. These need account-level access the agent must not have.
7. **Engage** — set up GA4, pixels, and email flows per `docs/`.
8. **QA** — run `node scripts/qa-check.mjs`. Fix blockers or report them.
9. **Handoff** — write `dist/<slug>/HANDOFF.md` with what was done and what
   remains manual.

## Output

- `dist/<slug>/` store package
- `dist/<slug>/HANDOFF.md` summary
- An unpublished theme in the Shopify store

## Stop conditions

Stop and ask the human when a step needs credentials, a jurisdiction decision,
or would publish to a live store.
