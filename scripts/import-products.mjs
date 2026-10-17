#!/usr/bin/env node
// Imports products into Shopify via the Admin GraphQL API using the
// productSet mutation. Idempotent by handle.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAndValidate } from './validate-config.mjs';
import { loadEnv } from './lib/env.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Read lazily: loadEnv() runs in the CLI entry point, after this module body
// has already been evaluated, so a value from .env would otherwise be missed.
const apiVersion = () => process.env.SHOPIFY_API_VERSION || '2026-01';

const PRODUCT_SET = `
mutation ProductSet($input: ProductSetInput!, $identifier: ProductSetIdentifiers) {
  productSet(input: $input, identifier: $identifier, synchronous: true) {
    product { id handle title }
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
        results.push({ handle: p.handle, ok: errs.length === 0, errors: errs });
    }
    return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const arg = process.argv[2];
    if (!arg) {
        console.error('Usage: node scripts/import-products.mjs <config.json>');
        process.exit(2);
    }
    loadEnv();
    const domain = process.env.SHOPIFY_STORE_DOMAIN;
    const token = process.env.SHOPIFY_ADMIN_TOKEN;
    if (!domain || !token) {
        console.error('✗ Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_TOKEN in .env');
        process.exit(1);
    }
    const configPath = resolve(process.cwd(), arg);
    const { config, errors } = loadAndValidate(configPath);
    if (errors.length) {
        console.error('✗ config invalid; run validate first');
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
    for (const r of results.filter((r) => !r.ok)) {
        console.error(`  ✗ ${r.handle}: ${r.errors.map((e) => e.message).join('; ')}`);
    }
    process.exit(ok === results.length ? 0 : 1);
}
