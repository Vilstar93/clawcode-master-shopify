#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './lib/validate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function loadAndValidate(configPath) {
    const schema = JSON.parse(readFileSync(resolve(root, 'config/client.schema.json'), 'utf8'));
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    return { config, errors: validate(config, schema) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const arg = process.argv[2];
    if (!arg) {
        console.error('Usage: node scripts/validate-config.mjs <config.json>');
        process.exit(2);
    }
    const configPath = resolve(process.cwd(), arg);
    const { config, errors } = loadAndValidate(configPath);

    if (errors.length) {
        console.error(`✗ ${errors.length} problem(s) in ${arg}:`);
        for (const e of errors) console.error('  - ' + e);
        process.exit(1);
    }

    console.log(`✓ ${arg} is valid`);
    console.log(`  client:      ${config.client.slug} (${config.client.displayName})`);
    console.log(`  locale:      ${config.client.locale}`);
    console.log(`  products:    ${config.products.length}`);
    console.log(`  collections: ${(config.collections || []).length}`);
    console.log(`  payments:    ${(config.payments?.methods || []).join(', ') || 'none'}`);
}
