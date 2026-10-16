#!/usr/bin/env node
// Imports products into Shopify via the Admin GraphQL API using the
// productSet mutation. Idempotent by handle.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAndValidate } from './validate-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-01';

const PRODUCT_SET = `
mutation ProductSet($input: ProductSetInput!, $identifier: ProductSetIdentifiers) {
  productSet(input: $input, identifier: $identifier, synchronous: true) {
    product { id handle title }
    userErrors { field message }
  }
}`;

async function gql(domain, token, query, variables) {
    const res = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
        body: JSON.stringify({ query, variables })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    return json.data;
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
    const results = await importProducts(config, { domain, token });
    const ok = results.filter((r) => r.ok).length;
    console.log(`✓ imported ${ok}/${results.length} product(s)`);
    for (const r of results.filter((r) => !r.ok)) {
        console.error(`  ✗ ${r.handle}: ${r.errors.map((e) => e.message).join('; ')}`);
    }
    process.exit(ok === results.length ? 0 : 1);
}
