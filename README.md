# clawcode-master-shopify

Autonomous AI factory that builds complete, payment-ready Shopify stores.

One command prompt with client information in. One working store out.

## What this is

This repo is the operating system for an OpenClaw AI agent that builds Shopify
stores end to end: theme, products, collections, legal pages, shipping config,
emails, and analytics.

It is not a store. It is the machinery that produces stores.

## How it works

```
config/<client>.json  ->  scripts/build-store.mjs  ->  dist/<client>/
     (you fill this)        (the agent runs this)       (push to Shopify)
```

You supply one config file and the client's images. The agent reads `docs/`,
follows `playbooks/00-full-store-build.md`, and runs `scripts/`.

## Quick start

```bash
# 1. Try it with the example
node scripts/validate-config.mjs config/client.example.json
node scripts/build-store.mjs    config/client.example.json
node scripts/qa-check.mjs       config/client.example.json

# 2. Create a real client
cp config/client.example.json config/my-client.json
#    ... fill it in ...
node scripts/validate-config.mjs config/my-client.json
node scripts/build-store.mjs    config/my-client.json
```

## Commands

| Command | Purpose |
| --- | --- |
| `node scripts/validate-config.mjs <config>` | Check config against schema |
| `node scripts/build-store.mjs <config>` | Build the full store package |
| `node scripts/gen-products.mjs <config>` | Generate import CSV only |
| `node scripts/gen-legal.mjs <config>` | Generate legal pages only |
| `node scripts/push-theme.mjs <config>` | Push theme unpublished |
| `node scripts/import-products.mjs <config>` | Import products via Admin API |
| `node scripts/qa-check.mjs <config>` | Pre-handoff verification |

## Repository map

| Path | Purpose |
| --- | --- |
| `AGENTS.md` | Agent operating manual. Read first. |
| `docs/` | Knowledge base: Shopify, payments, shipping, AI providers, OpenClaw. |
| `playbooks/` | Step-by-step procedures. |
| `prompts/` | The one-shot command prompt and the system prompt. |
| `config/` | JSON schema and example client config. |
| `scripts/` | Executable automation. Zero dependencies. |
| `templates/legal-bg/` | Bulgarian legal page templates. |
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
