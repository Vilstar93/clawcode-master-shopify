#!/usr/bin/env node
// Orchestrates a full store package build into dist/<slug>/.
import { mkdirSync, writeFileSync, cpSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAndValidate } from './validate-config.mjs';
import { productsToCsv } from './gen-products.mjs';
import { generateLegal } from './gen-legal.mjs';
import { generateLanding } from './gen-landing.mjs';
import { generateHandoff } from './gen-handoff.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function buildStore(config) {
    const outDir = resolve(root, 'dist', config.client.slug);
    mkdirSync(outDir, { recursive: true });
    const steps = [];

    // 1. Products CSV for bulk import
    writeFileSync(resolve(outDir, 'products.csv'), productsToCsv(config));
    steps.push('products.csv');

    // 2. Legal pages
    const legal = generateLegal(config, resolve(outDir, 'legal'));
    steps.push(`${legal.length} legal page(s)`);

    // 3. Theme settings payload (consumed by push-theme.mjs)
    const settings = {
        brand: config.brand,
        client: config.client,
        store: config.store,
        integrations: config.integrations || {},
        collections: config.collections || [],
        navigation: buildNavigation(config)
    };
    writeFileSync(resolve(outDir, 'theme-settings.json'), JSON.stringify(settings, null, 2));
    steps.push('theme-settings.json');

    // 4. Build manifest
    writeFileSync(resolve(outDir, 'manifest.json'), JSON.stringify({
        slug: config.client.slug,
        displayName: config.client.displayName,
        locale: config.client.locale,
        generatedAt: new Date().toISOString(),
        products: config.products.length,
        collections: (config.collections || []).length,
        artifacts: ['products.csv', 'legal/', 'theme-settings.json']
    }, null, 2));
    steps.push('manifest.json');

    // 5. Copy client assets if present
    const assets = resolve(root, 'clients', config.client.slug);
    if (existsSync(assets)) {
        cpSync(assets, resolve(outDir, 'assets'), { recursive: true });
        steps.push('assets/');
    }

    // 6. Landing package (optional second output)
    if (config.store?.type === 'landing' || config.build?.landing) {
        const { written } = generateLanding(config);
        steps.push(`landing/ (${written.length} file(s))`);
    }

    // 7. Handoff document, filled from QA results
    const { failed } = generateHandoff(config, { preparedFor: config.client.legalName });
    steps.push(`HANDOFF.md${failed ? ` (${failed} blocker(s))` : ''}`);

    return { outDir, steps };
}

function buildNavigation(config) {
    const collections = (config.collections || []).map((c) => ({
        title: c.title,
        url: `/collections/${c.handle}`
    }));
    return [
        { title: 'Начало', url: '/' },
        ...collections,
        { title: 'Доставка и плащане', url: '/pages/dostavka-i-plashtane' },
        { title: 'Контакти', url: '/pages/kontakti' }
    ];
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const arg = process.argv[2];
    if (!arg) {
        console.error('Usage: node scripts/build-store.mjs <config.json>');
        process.exit(2);
    }
    const configPath = resolve(process.cwd(), arg);
    const { config, errors } = loadAndValidate(configPath);
    if (errors.length) {
        console.error(`✗ config invalid (${errors.length} problem(s)); run validate first`);
        errors.forEach((e) => console.error('  - ' + e));
        process.exit(1);
    }
    const { outDir, steps } = buildStore(config);
    console.log(`✓ built ${config.client.slug}`);
    steps.forEach((s) => console.log('  + ' + s));
    console.log(`  -> ${outDir}`);
}
