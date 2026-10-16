#!/usr/bin/env node
// Pre-handoff QA checks against the built store package.
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAndValidate } from './validate-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function qa(config, distDir) {
    const checks = [];
    const add = (name, ok, detail = '') => checks.push({ name, ok, detail });

    add('config valid', true);
    add('products >= 1', config.products.length >= 1, `${config.products.length}`);

    const dupHandles = config.products
        .map((p) => p.handle)
        .filter((h, i, a) => a.indexOf(h) !== i);
    add('unique product handles', dupHandles.length === 0, dupHandles.join(', '));

    const missingImages = config.products.filter((p) => !p.images?.length).map((p) => p.handle);
    add('every product has an image', missingImages.length === 0, missingImages.join(', '));

    const missingDesc = config.products.filter((p) => !p.description).map((p) => p.handle);
    add('every product has a description', missingDesc.length === 0, missingDesc.join(', '));

    add('contact email set', Boolean(config.client.email));
    add('legal entity set', Boolean(config.client.legalName && config.client.eik));
    add('address set', Boolean(config.client.address?.street && config.client.address?.city));
    add('shipping carriers set', (config.shipping?.carriers || []).length > 0);
    add('payment methods set', (config.payments?.methods || []).length > 0);
    add('currency set', Boolean(config.client.currency));
    add('GA4 configured', Boolean(config.integrations?.ga4), config.integrations?.ga4 || 'not set');

    const hasProductsCsv = existsSync(resolve(distDir, 'products.csv'));
    add('products.csv built', hasProductsCsv);
    const hasLegal = existsSync(resolve(distDir, 'legal'));
    add('legal pages built', hasLegal);
    const hasTheme = existsSync(resolve(root, 'theme/layout'));
    add('theme present', hasTheme, hasTheme ? '' : 'run: git subtree add --prefix=theme ...');

    return checks;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const arg = process.argv[2];
    if (!arg) {
        console.error('Usage: node scripts/qa-check.mjs <config.json>');
        process.exit(2);
    }
    const configPath = resolve(process.cwd(), arg);
    const { config, errors } = loadAndValidate(configPath);
    if (errors.length) {
        console.error('✗ config invalid; run validate first');
        process.exit(1);
    }
    const distDir = resolve(root, 'dist', config.client.slug);
    const checks = qa(config, distDir);
    const failed = checks.filter((c) => !c.ok);

    for (const c of checks) {
        console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? ' — ' + c.detail : ''}`);
    }
    console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

    if (failed.length) {
        console.log('\nBlockers before handoff:');
        failed.forEach((f) => console.log('  - ' + f.name + (f.detail ? ` (${f.detail})` : '')));
        process.exit(1);
    }
    console.log('\nReady for handoff. Remember: legal pages need human review.');
}
