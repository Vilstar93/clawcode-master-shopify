# Domain, hosting, and DNS — Shopify only

This factory does not use Cloudflare. Domains are bought and managed inside
Shopify. Hosting is Shopify. DNS is Shopify. One vendor, one dashboard.

## Why Shopify-only

- A previous build broke when a third-party DNS layer was involved.
- Fewer moving parts means fewer failure modes.
- Shopify provisions TLS automatically and renews it.
- One place to look when something is wrong.

## Buying the domain in Shopify

1. Shopify admin → **Settings** → **Domains**.
2. Click **Buy new domain**.
3. Search for the domain, add it to the cart, and pay.
4. Shopify sets it as the primary domain and issues the certificate.

The domain is billed through your Shopify invoice.

## Connecting a domain bought elsewhere

If the client already owns the domain:

1. Settings → Domains → **Connect existing domain**.
2. Enter the domain.
3. At the client's registrar, point the DNS records to Shopify:
   - `A` record → `23.227.38.65`
   - `CNAME` `www` → `shops.myshopify.com`
4. Wait for verification. Shopify issues TLS once DNS resolves.

Verify the current values in the Shopify admin before applying them — Shopify
occasionally updates its IP.

## What the agent may do

- Read the target domain from `config.store.domain`.
- Set it in theme settings and in the store URL references.
- Remind the human to complete the purchase or the DNS step.

## What the agent must not do

- Buy a domain (needs payment credentials).
- Change DNS at a registrar (needs account access).
- Add any third-party proxy, CDN, or DNS provider.

## Checklist

- [ ] Domain chosen and available
- [ ] Purchased in Shopify, or connected from the client's registrar
- [ ] Primary domain set
- [ ] TLS active (Shopify does this automatically)
- [ ] `www` redirects to the primary domain
- [ ] Email sender domain verified for notifications

## Migrating off Cloudflare

If a store is currently behind Cloudflare:

1. In Cloudflare, note the existing DNS records.
2. In Shopify, add the domain as primary.
3. Update the registrar to Shopify's records, or transfer the domain into
   Shopify.
4. Wait for propagation and TLS issuance.
5. Remove the domain from Cloudflare once Shopify serves it.

Do not run both proxies at once. Pick Shopify and let the old layer go.
