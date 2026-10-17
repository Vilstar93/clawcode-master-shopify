#!/usr/bin/env node
// Imports products into Shopify via the Admin GraphQL API using the
// productSet mutation. Idempotent by handle.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAndValidate } from './validate-config.mjs';
import { loadEnv } from './lib/env.mjs';
import { sameDomain } from './lib/domain.mjs';
import { getAccessToken, storedToken, hasClientCredentials } from './lib/shopify-token.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Read lazily: loadEnv() runs in the CLI entry point, after this module body
// has already been evaluated, so a value from .env would otherwise be missed.
const apiVersion = () => process.env.SHOPIFY_API_VERSION || '2026-01';

const PRODUCT_SET = `
mutation ProductSet($input: ProductSetInput!, $identifier: ProductSetIdentifiers) {
  productSet(input: $input, identifier: $identifier, synchronous: true) {
    product {
      id
      handle
      title
      variants(first: 1) { nodes { id } }
    }
    userErrors { field message }
  }
}`;

async function gql(domain, token, query, variables) {
    let res;
    try {
        res = await fetch(`https://${domain}/admin/api/${apiVersion()}/graphql.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
            body: JSON.stringify({ query, variables })
        });
    } catch (cause) {
        // A bad domain and a dead network both surface here as a bare fetch
        // rejection, which on its own does not say what to fix.
        throw new Error(`Cannot reach ${domain}. Check SHOPIFY_STORE_DOMAIN and the network.`);
    }
    if (!res.ok) {
        throw new Error(describeHttpError(res.status, domain, await res.text()));
    }
    const json = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    return json.data;
}

// Shopify answers with an opaque HTTP status. Map the ones an operator can act
// on to the action, rather than printing the raw body.
export function describeHttpError(status, domain, body) {
    if (status === 401 || status === 403) {
        return `Shopify rejected the access token (HTTP ${status}). Check SHOPIFY_ADMIN_TOKEN, and that the app has write_products.`;
    }
    if (status === 404) {
        return `No store at ${domain} (HTTP 404). Check SHOPIFY_STORE_DOMAIN.`;
    }
    if (status === 402) {
        return `Store ${domain} cannot accept writes (HTTP 402). Check the Shopify plan.`;
    }
    if (status === 429) {
        return `Shopify rate limit hit (HTTP 429). Wait and run the import again.`;
    }
    return `Shopify returned HTTP ${status}: ${body.slice(0, 200)}`;
}

function toProductSetInput(p, vendor) {
    return {
        handle: p.handle,
        title: p.title,
        descriptionHtml: `<p>${(p.description || p.shortDescription || '').replace(/\n/g, '</p><p>')}</p>`,
        vendor,
        productType: p.category || '',
        tags: p.tags || [],
        status: 'ACTIVE',
        productOptions: p.variants?.length
            ? [{ name: p.variants[0].option || 'Title', values: p.variants.map((v) => ({ name: v.value })) }]
            : [{ name: 'Title', values: [{ name: 'Default Title' }] }]
    };
}

export async function importProducts(config, { domain, token }) {
    const results = [];
    for (const p of config.products) {
        const data = await gql(domain, token, PRODUCT_SET, {
            input: toProductSetInput(p, config.client.displayName),
            identifier: { handle: p.handle }
        });
        const errs = data.productSet.userErrors || [];
        const product = data.productSet.product;
        results.push({
            handle: p.handle,
            ok: errs.length === 0,
            errors: errs,
            // The landing checkout needs the numeric variant id, not the GID.
            // Storing the GID would make /api/buy send Shopify an id it cannot
            // resolve, so the last path segment is what goes back into config.
            variantId: variantIdOf(product),
        });
    }
    return results;
}

// Shopify returns "gid://shopify/ProductVariant/123456789". The landing bundle
// compares against a plain number, so keep only the trailing digits.
export function variantIdOf(product) {
    const gid = product?.variants?.nodes?.[0]?.id;
    if (!gid) return undefined;
    const match = String(gid).match(/(\d+)$/);
    return match ? match[1] : undefined;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const arg = process.argv[2];
    if (!arg) {
        console.error('Usage: node scripts/import-products.mjs <config.json>');
        process.exit(2);
    }
    loadEnv();
    // A stored token is the only credential that works for a client's store,
    // since client credentials cannot reach a store outside the app's own
    // organization. Accept either, and resolve the token after the domain is
    // known so the client credentials request can address the right shop.
    if (!storedToken() && !hasClientCredentials()) {
        console.error('✗ No Shopify credentials. Set one of these in .env:');
        console.error('  SHOPIFY_ADMIN_TOKEN                    (authorization code grant)');
        console.error('  SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET  (Dev Dashboard app)');
        process.exit(1);
    }
    const configPath = resolve(process.cwd(), arg);
    const { config, errors } = loadAndValidate(configPath);
    if (errors.length) {
        console.error('✗ config invalid; run validate first');
        process.exit(1);
    }
    // The config names the store. Reading the domain from .env here let one
    // client's products land in another client's store when a single .env
    // serves several clients.
    const domain = config.store.domain;
    const envDomain = process.env.SHOPIFY_STORE_DOMAIN;
    if (envDomain && !sameDomain(envDomain, domain)) {
        console.error(`✗ SHOPIFY_STORE_DOMAIN is ${envDomain} but this config targets ${domain}.`);
        process.exit(1);
    }
    let token;
    try {
        token = await getAccessToken({ domain });
    } catch (error) {
        console.error(`✗ ${error.message}`);
        process.exit(1);
    }
    // importProducts() talks to the network and can throw before returning any
    // per-product result. Uncaught, that prints a stack trace and reads as a
    // crash in the factory rather than a rejected credential.
    let results;
    try {
        results = await importProducts(config, { domain, token });
    } catch (error) {
        console.error(`✗ import failed: ${error.message}`);
        process.exit(1);
    }
    const ok = results.filter((r) => r.ok).length;
    console.log(`✓ imported ${ok}/${results.length} product(s)`);
    for (const r of results.filter((r) => r.ok)) {
        if (r.variantId) console.log(`  ${r.handle} -> variant ${r.variantId}`);
    }
    for (const r of results.filter((r) => !r.ok)) {
        console.error(`  ✗ ${r.handle}: ${r.errors.map((e) => e.message).join('; ')}`);
    }
    // A successful import that returns no variant id leaves a landing store
    // unable to sell, so print what to do instead of failing silently.
    const unlinked = results.filter((r) => r.ok && !r.variantId);
    if (unlinked.length) {
        console.error(`  ⚠ no variant id for: ${unlinked.map((r) => r.handle).join(', ')}`);
        console.error('    Landing stores cannot sell without one; check the product in Shopify.');
    }
    process.exit(ok === results.length ? 0 : 1);
}
