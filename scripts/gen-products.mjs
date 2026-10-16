#!/usr/bin/env node
// Generates a Shopify product import CSV from a client config.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAndValidate } from './validate-config.mjs';

const COLUMNS = [
    'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags', 'Published',
    'Option1 Name', 'Option1 Value', 'Variant SKU', 'Variant Inventory Qty',
    'Variant Inventory Policy', 'Variant Fulfillment Service', 'Variant Price',
    'Variant Compare At Price', 'Variant Requires Shipping', 'Variant Taxable',
    'Image Src', 'Image Position', 'Status'
];

const esc = (v) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export function productsToCsv(config) {
    const rows = [COLUMNS.join(',')];
    const vendor = config.client.displayName;
    const money = (n) => (n === undefined || n === null ? '' : Number(n).toFixed(2));

    for (const p of config.products) {
        const variants = p.variants?.length
            ? p.variants
            : [{ option: '', value: '', price: p.price, sku: p.sku }];
        const optionName = variants[0].option || 'Title';

        variants.forEach((v, i) => {
            const first = i === 0;
            const row = [
                p.handle,
                first ? p.title : '',
                first ? (p.description || p.shortDescription || '') : '',
                first ? vendor : '',
                first ? (p.category || '') : '',
                first ? (p.tags || []).join(', ') : '',
                first ? 'TRUE' : '',
                first ? optionName : '',
                v.value || (variants.length === 1 ? 'Default Title' : ''),
                v.sku || p.sku || '',
                first ? (p.stock ?? 0) : '',
                first ? 'deny' : '',
                first ? 'manual' : '',
                money(v.price ?? p.price),
                first ? money(p.compareAtPrice) : '',
                'TRUE',
                'TRUE',
                first ? (p.images?.[0] || '') : (p.images?.[i] || ''),
                first ? 1 : '',
                'active'
            ];
            rows.push(row.map(esc).join(','));
        });
    }
    return rows.join('\n') + '\n';
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const arg = process.argv[2];
    if (!arg) {
        console.error('Usage: node scripts/gen-products.mjs <config.json> [out.csv]');
        process.exit(2);
    }
    const configPath = resolve(process.cwd(), arg);
    const { config, errors } = loadAndValidate(configPath);
    if (errors.length) {
        console.error('✗ config invalid; run validate first');
        process.exit(1);
    }
    const csv = productsToCsv(config);
    const out = process.argv[3] || resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist', config.client.slug, 'products.csv');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, csv);
    console.log(`✓ wrote ${config.products.length} product(s) -> ${out}`);
}
