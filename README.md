# clawcode-master-shopify

AI-assisted factory that prepares Shopify store packages for Bulgarian firms.

One config file with client information in. One reviewable store package out,
plus an explicit list of what a human still has to do.

## What this is

This repo is the operating system for an OpenClaw AI agent that assembles
Shopify store packages: theme, products, collections, legal page drafts,
shipping config, emails, and analytics wiring.

It is not a store. It is the machinery that produces store packages.

## What "done" means here — read this before quoting a client

The build is automated. **Going live is not.** Every build ends with a handoff
document listing the steps the agent cannot take, because each needs account
access or human judgement. On the example config that list has 21 items,
including:

- enabling the payment provider in the Shopify admin
- configuring shipping rates and carriers
- reviewing the legal pages and removing the DRAFT stamp
- confirming tax settings with an accountant
- buying or connecting the domain
- publishing the theme, after review
- running one test order end to end

A generated store is a **draft awaiting review**, never a live shop. `qa-check`
refuses to call a package ready while a blocker is open, and the handoff
document states the same verdict at the top.

The realistic promise to a client is: the repetitive assembly is done and the
remaining work is a short, listed checklist — not that the store is finished.

## How it works

```
portal request        ->  scripts/new-client.mjs  ->  config/<client>.json
(9 fields, from you)                                   (you complete it)
                                                             |
                                                             v
                        dist/<client>/  <-  scripts/build-store.mjs
                                                             |
                              you create the store in Shopify  |
                                                             v
                        scripts/deploy.mjs  ->  live draft store
                        (import, variant ids, QA, theme)
```

A portal request carries nine fields. A config needs about sixty, so
`new-client.mjs` derives the rest: slug, Bulgarian defaults, address split, and
placeholder products. Everything it invents is marked `TODO`, and `qa-check`
refuses to pass a store that still contains one.

`deploy.mjs` is the second half. Once the store exists, one command imports the
products, writes the variant ids Shopify returns back into the config, rebuilds
the landing bundle so it can sell, and pushes the theme unpublished. It refuses
to import while QA reports blockers, because a `TODO` product with a `0.00` price
becomes junk in a real store. See `docs/01-shopify-setup.md`.

**Creating the store itself is manual.** Shopify has no public API for it: a
store needs a signed-up owner and a paid plan. `deploy.mjs` takes over from
there.

**New here? Start with [`AGENT-BUILD.md`](AGENT-BUILD.md)** — how to stand up the
agent, and how to get the most out of a ChatGPT Plus plan.

Hosting and DNS are Shopify-only. No Cloudflare, no third-party proxy.
See `docs/07-domain-and-hosting.md`.

## Quick start

The normal path is one command per client. It takes a portal request and runs
request -> config -> build -> QA:

```bash
node scripts/new-client.mjs examples/request.example.json
```

That writes `config/<slug>.json` and `dist/<slug>/`, then prints the QA blockers
and the exact fields that still need a real value. A fresh config is full of
placeholders, so QA will refuse it until you fill them in — that is the point.
Edit the config, re-run `build-store` and `qa-check`, and repeat until QA says
`Ready for handoff`.

`new-client.mjs` never touches Shopify. Pushing the theme and importing products
need credentials and a real store, so they stay explicit, separate commands.

```bash
# Work with the example instead
node scripts/validate-config.mjs config/client.example.json
node scripts/build-store.mjs    config/client.example.json
node scripts/qa-check.mjs       config/client.example.json

# No portal request? Copy the example and fill it in by hand
cp config/client.example.json config/my-client.json
```

## Commands

| Command | Purpose |
| --- | --- |
| `node scripts/new-client.mjs <request>` | One client, whole pipeline: request -> config -> build -> QA |
| `node scripts/from-request.mjs <request>` | Just the request -> config step |
| `node scripts/validate-config.mjs <config>` | Check config against schema |
| `node scripts/build-store.mjs <config>` | Build the full store package |
| `node scripts/gen-products.mjs <config>` | Generate import CSV only |
| `node scripts/gen-legal.mjs <config>` | Generate legal pages only |
| `node scripts/gen-landing.mjs <config>` | Render landing + Shopify checkout |
| `node scripts/gen-handoff.mjs <config>` | Write the client handoff document |
| `node scripts/push-theme.mjs <config>` | Push theme unpublished |
| `node scripts/import-products.mjs <config>` | Import products via Admin API |
| `node scripts/qa-check.mjs <config>` | Pre-handoff verification |

## Two store types

Set `store.type` in the config:

| Type | Output | Checkout |
| --- | --- | --- |
| `store` (default) | Full storefront package | Shopify storefront |
| `landing` | One-page bundle + serverless function | Shopify cart permalink, no API token |

A landing store is a fast path: one conversion page, Shopify's own hosted
checkout, nothing to leak. See `docs/08-store-types.md`.

## Deliverables

Every build produces `dist/<slug>/`:

```
products.csv           Shopify bulk import file
legal/                 5 Bulgarian legal pages, stamped DRAFT
theme-settings.json    Brand + navigation payload
manifest.json          Build metadata
HANDOFF.md             Client delivery document, filled from QA results
landing/               (landing type) deployable bundle
assets/                Client images
```

## Repository map

| Path | Purpose |
| --- | --- |
| `AGENT-BUILD.md` | Build the autonomous agent + maximize ChatGPT Plus. |
| `AGENTS.md` | Agent operating manual. Read first. |
| `docs/` | Knowledge base: Shopify, payments, shipping, AI providers, OpenClaw, domains. |
| `playbooks/` | Step-by-step procedures. |
| `prompts/` | The one-shot command prompt and the system prompt. |
| `config/` | JSON schema and example client config. |
| `scripts/` | Executable automation. Zero dependencies. |
| `templates/legal-bg/` | Bulgarian legal page templates. |
| `templates/landing/` | Landing + Shopify checkout template. |
| `templates/handoff/` | Client handoff document template. |
| `openclaw/` | Agent config and skills. |
| `clients/` | Per-client assets (images, logos). |
| `theme/` | Master theme (Dawn subtree). |

## Branch model

| Branch | Purpose |
| --- | --- |
| `main` | Stable factory. |
| `agent` | OpenClaw config, skills, model routing. |
| `store` | Client deliverables. |
| `commands` | Command prompts. |
| `optimizations` | Conversion, SEO, performance. |
| `theme-base` | Master Dawn theme. |
| `legal-bg` | Bulgarian legal templates. |

See `docs/05-branches.md`.

## The 9 phases

Intake, scaffold, theme, products, legal, commerce, engage, QA, handoff.
Full detail in `playbooks/00-full-store-build.md`.

## What stays manual

Payment credentials, tax settings, and legal review. These need account access
and human judgment. The agent prepares everything up to that line.

Two traps worth knowing about, because both look finished while being broken:

- A product with a `TODO` title or a `0.00` price. `qa-check` refuses these.
- A `landing` store whose products have no `variantId`. The buy button posts to
  `/api/buy`, which resolves a slug to a Shopify variant id; until products are
  imported the bundle ships an empty product list and every button answers
  "Продуктът не е свързан с Shopify." `qa-check` refuses this too.

The order is: build, import products, copy the variant ids back into the config,
rebuild, then push the theme.

## Requirements

- Node.js 20+
- Shopify CLI (`npm i -g @shopify/cli`)
- A Shopify Partner account and a store
- OpenClaw, with a model and the Shopify plugin

## Safety rules

1. Never commit secrets. Use `.env` (gitignored).
2. Never publish a theme without review. Push unpublished.
3. Legal templates are drafts. A human reviews before publishing.
4. Payment credentials live in the Shopify admin, never here.

## License

MIT
