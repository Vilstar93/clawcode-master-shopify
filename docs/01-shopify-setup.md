# Shopify setup

## The whole flow, in order

**Creating the store is manual.** Shopify has no public API for it: a store
needs an owner who signed up and a plan that is paid. Steps 1 to 3 below are
yours. Everything after that is one command.

```bash
# 1. You: create the store and note the domain.            (Shopify admin)
# 2. You: put the domain in config/<client>.json store.domain
# 3. You: put the credentials in .env   (see "Credentials" below)

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

## Credentials (for product import)

Shopify stopped showing a copyable admin token on 1 January 2026. The legacy
"Develop apps" flow in the store admin no longer creates new apps. Where your
credentials come from now depends on whose store you are deploying to, and the
two cases are not interchangeable. Which one you have decides the flow, and
picking the wrong one fails with an error that does not name the cause.

### A dev store in your Dev Dashboard organization: Client ID + secret

The client credentials grant works only here. A dev store created from the same
Dev Dashboard as the app is in the same organization, so the request succeeds
and there is no token to copy: the code asks for one and caches it for 24 hours.

1. Open the [Dev Dashboard](https://dev.shopify.com/dashboard/) → **Apps** →
   **Create app**.
2. Add a version with the scope `write_products`. That covers the import, which
   calls `productSet` and nothing else. A write scope already grants read, and
   extra scopes only widen what a leaked token can do.

   The theme push does **not** use this token. It uses `SHOPIFY_CLI_THEME_TOKEN`,
   which `npx shopify theme token` issues and which carries the theme scopes the
   CLI needs. Adding `write_themes` here would not help the push and would widen
   the Admin token for no reason.

   If the app form asks for a redirect URL, any URL works — the client
   credentials grant never redirects.
3. Install the app on the dev store.
4. **Settings** → copy the **Client ID** and **Client secret**.
5. Put them in `.env`:

```bash
SHOPIFY_CLIENT_ID=...
SHOPIFY_CLIENT_SECRET=...
```

### Any real store, including a client's: the authorization code grant

A live store is **not** in the app's organization, even when you own it and the
app is installed. The token endpoint then answers:

```
400 - Oauth error application_cannot_be_found
Could not find Shopify API application with api_key
```

The store's OAuth service cannot see an app from another organization, so the
request never reaches the shop check. This is not a setup mistake and nothing in
the Dev Dashboard fixes it.

Run the authorization code grant instead. It works for any store where the app
is installed and someone can approve it, and the token it returns does not
expire:

```bash
node scripts/shopify-auth.mjs
```

The script prints a URL. Open it, approve the app, and copy the address bar of
the page you land on — the redirect goes to the app's registered URL, which is
not a real page, so the page shows an error and the code is in its URL. Paste
that back and the script verifies Shopify's signature, exchanges the code, checks
the token against the store, and writes `SHOPIFY_ADMIN_TOKEN` to `.env`.

Set the redirect URL in the app first: Dev Dashboard → the app → **URLs** →
**Allowed redirection URL(s)**. The default `https://example.com/auth/callback`
is fine; override with `SHOPIFY_REDIRECT_URI` if you registered something else.

Never commit these. `.env` is gitignored.

### Which one applies

`SHOPIFY_ADMIN_TOKEN` wins when both are set, because it is the only one that
can work for a client store. If you see `shop_not_permitted`, the store is not
in your organization and you need the second path.

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
