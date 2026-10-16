# Shopify setup

## Creating the store

1. Create a Shopify Partner account.
2. Create a development store per client, or a store on the client's account.
3. Note the store domain: `<store>.myshopify.com`.

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
