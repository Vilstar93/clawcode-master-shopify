#!/usr/bin/env node
// Pushes the master theme to Shopify as UNPUBLISHED using the Shopify CLI.
// Never publishes to a live store.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAndValidate } from './validate-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, opts = {}) {
    const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts });
    return r.status ?? 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const arg = process.argv[2];
    if (!arg) {
        console.error('Usage: node scripts/push-theme.mjs <config.json> [--unpublished]');
        process.exit(2);
    }
    const configPath = resolve(process.cwd(), arg);
    const { config, errors } = loadAndValidate(configPath);
    if (errors.length) {
        console.error('✗ config invalid; run validate first');
        process.exit(1);
    }

    const themeDir = resolve(root, 'theme');
    if (!existsSync(themeDir)) {
        console.error('✗ theme/ is empty. Add the master theme first:');
        console.error('   git subtree add --prefix=theme https://github.com/Shopify/dawn.git main --squash');
        process.exit(1);
    }

    const store = config.store.domain;
    console.log(`→ pushing theme to ${store} (unpublished)`);
    const args = ['shopify', 'theme', 'push', '--store', store, '--unpublished', '--path', themeDir];
    process.exit(run('npx', args));
}
