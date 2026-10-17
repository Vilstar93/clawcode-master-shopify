# Shopify setup

## The whole flow, in order

**Creating the store is manual.** Shopify has no public API for it: a store
needs an owner who signed up and a plan that is paid. Steps 1 to 3 below are
yours. Everything after that is one command.

```bash
# 1. You: create the store and note the domain.            (Shopify admin)
# 2. You: put the domain in config/<client>.json store.domain
# 3. You: put the admin token in .env

node scripts/deploy.mjs config/<client>.json
```

`deploy.mjs` then:

1. builds the package and runs QA,
2. **stops if QA reports blockers** — a `TODO` product with a `0.00` price
   would become junk in a real store,
3. imports the products,
4. writes the variant ids Shopify returns back into the config,
5. rebuilds the landing bundle so its buy buttons have ids,
6. pushes the theme **unpublished**.

Nothing is ever published. Review it in Shopify, then publish by hand.

Re-running is safe: the import is idempotent by handle, so a second run updates
the same products instead of duplicating them.

### The one .env, many stores trap

`.env` holds one `SHOPIFY_STORE_DOMAIN`, but each config names its own store. If
they disagree, `deploy.mjs` stops rather than write to a store the config does
not name. With two clients this is the difference between importing into the
right shop and importing into the wrong one.

## Creating the store

1. Create a Shopify Partner account.
2. Create a development store per client, or a store on the client's account.
3. Note the store domain: `<store>.myshopify.com`.

A development store is free and is a real store for building in: the theme,
products, and checkout all work. It cannot take live payments until the client
picks a plan. For a store the client will sell from, they sign up and pay; you
cannot do that part for them, and no API will.

## Admin API token (for product import)

1. Shopify admin → Settings → Apps and sales channels → Develop apps.
2. Create an app, name it `store-factory`.
3. Configure Admin API scopes: `write_products`, `read_products`,
   `write_content`, `read_content`.
4. Install the app and copy the Admin API access token.
5. Put it in `.env` as `SHOPIFY_ADMIN_TOKEN`.

Never commit this token. `.env` is gitignored.

## Shopify CLI (for theme push)

```bash
npm i -g @shopify/cli
shopify auth login --store <store>.myshopify.com
```

Then `node scripts/push-theme.mjs` works without a stored token.

## Theme

The master theme is Dawn:

```bash
git subtree add --prefix=theme https://github.com/Shopify/dawn.git main --squash
```

Update it later with `git subtree pull`.

## Shopify AI Toolkit (for the agent)

Gives the agent docs, API schemas, and Liquid/GraphQL validation:

```bash
openclaw plugins install npm:@shopify/ai-toolkit
```

## API version

The scripts target `2026-01`. Override with `SHOPIFY_API_VERSION` in `.env`.
Shopify supports each version for about a year.
