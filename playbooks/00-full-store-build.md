# Playbook: Full store build

The canonical procedure. The agent follows this top to bottom.

## Phase 1 — Intake

**Goal:** know exactly what to build, or stop.

1. Read `config/<client>.json`.
2. Run `node scripts/validate-config.mjs config/<client>.json`.
3. If it fails, list every problem and stop. Do not invent values.
4. Confirm assets exist in `clients/<slug>/` (logo, product images).
5. Report what is missing before continuing.

**Exit:** config is valid and assets are present, or the build is blocked.

## Phase 2 — Scaffold

**Goal:** produce the store package.

```bash
node scripts/build-store.mjs config/<client>.json
```

Produces `dist/<slug>/` with `products.csv`, `legal/`, `theme-settings.json`,
`manifest.json`, and `assets/`.

**Exit:** `dist/<slug>/manifest.json` exists.

## Phase 3 — Theme

**Goal:** an unpublished theme in the store.

1. Check `theme/layout/` exists. If not, tell the human:
   ```bash
   git subtree add --prefix=theme https://github.com/Shopify/dawn.git main --squash
   ```
2. Apply brand settings from `dist/<slug>/theme-settings.json`.
3. Validate Liquid with the Shopify plugin.
4. Push:
   ```bash
   node scripts/push-theme.mjs config/<client>.json
   ```

**Exit:** preview URL obtained. Theme is unpublished.

## Phase 4 — Products

**Goal:** catalog live in the store.

1. If `SHOPIFY_ADMIN_TOKEN` is set:
   ```bash
   node scripts/import-products.mjs config/<client>.json
   ```
   Idempotent by handle.
2. Otherwise, hand the human `dist/<slug>/products.csv`.

**Exit:** products imported, or the CSV delivered.

## Phase 5 — Legal

**Goal:** compliant pages, marked as drafts.

1. Legal pages were generated in Phase 2.
2. Verify every required value rendered (no `{{placeholders}}` left).
3. Flag all pages for human review.

**Exit:** pages generated and flagged. Never publish without review.

## Phase 6 — Commerce

**Goal:** the store can take money.

This phase is **human-driven**. The agent prepares and instructs; it does not
enter credentials.

1. Payment provider: the human enables it in the Shopify admin.
2. Shipping: the human creates rates from `config.shipping`.
3. Taxes: the human confirms tax settings.
4. Checkout: the human reviews checkout settings.

**Exit:** the human confirms payment and shipping work.

## Phase 7 — Engage

**Goal:** the store can be found and can retain.

1. Add GA4 and pixels from `config.integrations`.
2. Set up email flows: welcome, abandoned cart, order confirmation.
3. Optionally enable Google Merchant Center.

**Exit:** analytics and at least the abandoned-cart flow are live.

## Phase 8 — QA

```bash
node scripts/qa-check.mjs config/<client>.json
```

Every failure is a blocker.

**Exit:** all checks pass, or blockers are documented.

## Phase 9 — Handoff

Write `dist/<slug>/HANDOFF.md` using the template in
`openclaw/skills/shopify-qa/SKILL.md`. List what was built automatically and
what a human must finish.

**Exit:** handoff document written and delivered.
