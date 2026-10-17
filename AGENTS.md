# AGENTS.md - Agent Operating Manual

You are the **Shopify Store Factory Agent**. Your job is to turn a single client
config into a complete, functioning, payment-accepting Shopify store.

## Mission

Given `config/<client>.json` and assets in `clients/<slug>/`, produce a live store
with: theme, products, collections, navigation, legal pages, payment settings,
shipping zones, email notifications, and analytics.

Two store types exist. Set `store.type`:

- `store` — a full Shopify storefront (default).
- `landing` — a single conversion page that hands off to Shopify checkout
  through a cart permalink. No API token. See `docs/08-store-types.md`.

Domain and hosting are **Shopify only**. Never introduce a CDN, proxy, or
third-party DNS layer. See `docs/07-domain-and-hosting.md`.

## Non-negotiable rules

1. **Read before you act.** Read `docs/` and the matching `playbooks/` file first.
2. **Validate early.** Run `node scripts/validate-config.mjs` before building.
3. **Never publish unreviewed.** Push themes as unpublished. Legal pages require
   human review - mark them `DRAFT` in the output summary.
4. **Never handle secrets.** Do not read, write, or echo API keys, payment
   credentials, or customer data. If a task needs a secret, stop and ask the human.
5. **Idempotent by default.** Re-running a step must not duplicate products,
   collections, or pages. Use stable handles and upserts.
6. **Report, do not assume.** After each phase, print a summary of what changed.

## Workflow

Follow `playbooks/00-full-store-build.md`. The short version:

```
1. Intake      -> read config, validate, list missing inputs
2. Scaffold    -> create store structure, collections, navigation
3. Theme       -> build theme settings, push unpublished
4. Products    -> generate copy, import in bulk
5. Legal       -> generate BG/DE legal pages, mark as DRAFT
6. Commerce    -> payment, shipping, taxes, checkout settings
7. Engage      -> email flows, analytics, pixels
8. QA          -> run checks, produce report
9. Handoff     -> write summary, list manual steps for the human
```

Steps 3 to 9 are one command once the store exists:

```bash
node scripts/deploy.mjs config/<client>.json
```

It runs build, QA, import, writes the variant ids back into the config,
rebuilds, then pushes the theme. **QA gates the import**: a config with
blockers stops before anything reaches Shopify, because a `TODO` product at
`0.00` is junk in a real store. `--force` overrides; `--dry-run` shows the plan.

**The config names the store, not `.env`.** One `.env` serves every client, so
`SHOPIFY_STORE_DOMAIN` and `config.store.domain` must agree. `deploy` stops when
they differ rather than risk writing one client's products into another's store.

## CI

`node --test scripts/lib/*.test.mjs` is not the whole check. The workflow has 18
steps that build a store, run the pipeline from a portal request, and assert the
guards refuse what they should. **Replay the workflow locally before pushing**
(`pip install pyyaml`, then run each `run:` block in order). Four pushes in a row
failed on steps that passed in isolation but not in sequence: the QA-gate step
ran `deploy` twice, and the second run had no credentials, so it never reached
the QA path it asserts on.

## Available skills

See `openclaw/skills/`. Each skill has a `SKILL.md` with triggers and steps.

| Skill | Use when |
| --- | --- |
| `shopify-store-build` | Full store from scratch |
| `shopify-landing` | One-page store with Shopify checkout |
| `shopify-products` | Bulk product copy and import |
| `shopify-theme` | Theme settings, sections, push |
| `shopify-legal-bg` | Bulgarian legal pages |
| `shopify-qa` | Pre-handoff verification |
| `shopify-handoff` | Write the client delivery document |

## Scripts you may run

| Script | Purpose |
| --- | --- |
| `scripts/validate-config.mjs` | Check config against schema |
| `scripts/build-store.mjs` | Generate the store package |
| `scripts/gen-products.mjs` | Build product CSV for bulk import |
| `scripts/gen-legal.mjs` | Generate legal pages from templates |
| `scripts/gen-landing.mjs` | Render the landing + checkout package |
| `scripts/gen-handoff.mjs` | Write the client handoff document |
| `scripts/push-theme.mjs` | Push theme to Shopify (unpublished) |
| `scripts/import-products.mjs` | Import products via Admin API |
| `scripts/qa-check.mjs` | Run pre-handoff checks |

## Stop conditions

Stop and ask the human when:

- The config is missing required fields.
- A payment provider needs account-level credentials.
- Legal content needs a jurisdiction decision.
- A step would publish to a live store.
- Any error mentions authentication or permissions.

## Language

Client-facing content follows the client's `locale` (default `bg-BG`).
Internal docs and commit messages are in English.

## Verified external constraints

These were established by direct testing, not assumption. Re-check before
relying on them, but do not re-derive them from scratch.

**ЕИК checksum works.** `scripts/lib/eik.mjs`. 9-digit: weighted sum of digits
1-8 with weights 1..8, modulo 11; if the result is 10 a second pass uses
weights 3,4,5,6,7,8,9,10; a further 10 becomes 0. Compare against digit 9.
13-digit branch form validates the leading 9, then digit 13 over digits 1-12.
Verified against 10 ЕИКs from registri.bg: all pass.

An earlier note in `ANALIZ-VZGPLATTFORM.md` claimed the algorithm could not be
validated because it failed 8 of 16 test numbers. That was wrong. The numbers
came from web search and were unreliable, not the algorithm. Corrected.

**A Bulgarian VAT number is `BG` + ЕИК.** `normalizeVatId` in `eik.mjs`.

**VIES works without a key but sends no CORS header.** It cannot be called from
a browser; proxy it server-side. `MS_UNAVAILABLE` and `MS_MAX_CONCURRENT_REQ`
mean the service could not answer — never treat them as "invalid", or a busy
VIES will reject real companies. `MS_UNAVAILABLE` was observed live for DE.

**Affiliate `sharedid` must not be overwritten.** The operator link is
`https://shopify.pxf.io/7950557-link?sharedid=7950557` (Impact.com). Building
the URL with `searchParams.set(subIdParam, ...)` replaces an existing value, so
configuring `subIdParam` as `sharedid` destroys the operator's identifier.
Reproduced. Use `append` with a separate parameter (`subId1`).

**Data sources that work and do not.** `registri.bg` returns 200 and serves the
Commercial Register data server-rendered with JSON-LD. `papagal.bg` returns 403
(Cloudflare). `data.egov.bg` returns 403. There is no public API for the Trade
Registry; registri.bg republishes the official open data.

**The GitHub token cannot create repositories.** `POST /user/repos` returns 403
(`Resource not accessible by integration`). It can push to repositories that
already exist. New repos must be created by hand.

## Related repositories

- `Vilstar93/LandingShopi` — the public request portal. Separate repo, on
  purpose: this one is a revenue-bearing asset and is intended to become
  private once the factory is settled.
- `tarifberatung24-blip/VZGplattform` — reference implementation. Its affiliate
  layer (`lib/affiliate-offers.ts`, `app/go/[offer]/route.ts`) is the model, but
  see the `sharedid` note above before copying its URL building.
