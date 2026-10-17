#!/usr/bin/env node
// Pushes the master theme to Shopify as UNPUBLISHED using the Shopify CLI.
// Never publishes to a live store.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAndValidate } from './validate-config.mjs';
import { loadEnv } from './lib/env.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, opts = {}) {
    // On Windows the Shopify CLI is a `shopify.cmd` shim, and Node refuses to
    // spawn a .cmd without a shell (it has since the fix for CVE-2024-27980).
    // Without the shell an installed CLI reports as "not installed or not on
    // PATH", which is exactly the wrong message to hit during a client trial.
    const r = spawnSync(cmd, args, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        ...opts,
    });
    // The CLI is not installed at all: say so rather than reporting exit 1.
    if (r.error && r.error.code === 'ENOENT') {
        console.error(`✗ ${cmd} is not installed or not on PATH.`);
        process.exit(1);
    }
    // A timeout kills the child, leaving status null. Callers must be able to
    // tell that apart from a real non-zero exit.
    if (r.error && r.error.code === 'ETIMEDOUT') return null;
    return r.status;
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

    loadEnv();

    // Shopify CLI authenticates interactively by opening a browser. Run from an
    // agent, that prompt is invisible and the process waits forever. Requiring a
    // theme access token up front turns an indefinite hang into an instruction.
    const token = process.env.SHOPIFY_CLI_THEME_TOKEN || process.env.SHOPIFY_ADMIN_TOKEN;
    if (!token) {
        console.error('✗ No theme token. Set SHOPIFY_CLI_THEME_TOKEN (or SHOPIFY_ADMIN_TOKEN) in .env.');
        console.error('  Create one with:  npx shopify theme token');
        process.exit(1);
    }

    const store = config.store.domain;
    // Shopify CLI 4.9.4 refuses --unpublished in a non-interactive shell unless
    // --theme names the new theme, and an agent always runs non-interactively.
    // Without this the push fails on a missing flag rather than on anything to
    // do with the store.
    const themeName = `${config.client?.displayName || config.client?.slug || 'Store'} (draft)`;
    console.log(`→ pushing theme to ${store} (unpublished)`);
    // Run from the repo root and pass the theme as a relative path. Under a
    // shell, Node joins arguments with spaces and does not quote them, so an
    // absolute path like C:\Users\First Last\... would split into two
    // arguments. A relative path cannot contain a space.
    const args = ['theme', 'push', '--store', store, '--unpublished', '--theme', themeName, '--path', 'theme'];

    // spawnSync has no timeout by default, so a CLI that stalls on a network
    // call blocks the agent indefinitely. Fail loudly instead.
    const status = run('shopify', args, {
        cwd: root,
        env: { ...process.env, SHOPIFY_CLI_THEME_TOKEN: token, SHOPIFY_FLAG_FORCE: '1' },
        timeout: 5 * 60 * 1000,
    });
    if (status === null) {
        console.error('✗ Shopify CLI did not finish within 5 minutes.');
        process.exit(1);
    }
    process.exit(status);
}