#!/usr/bin/env node
// One client, one command, all the way to a real store.
//
// new-client.mjs stops at the package and the QA report. This continues from
// there: it imports the products, writes the variant ids Shopify returns back
// into the config, rebuilds, and pushes the theme. That round trip matters for
// landing stores, whose buy button needs a variant id per product; without it
// the operator copies ids by hand and a mistake there ships a store that looks
// finished and sells nothing.
//
// Order is deliberate. Products are imported before the theme is pushed, and
// the rebuild happens after the ids come back, so the pushed theme contains the
// ids. It never publishes: the theme lands unpublished.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadAndValidate } from './validate-config.mjs';
import { loadEnv } from './lib/env.mjs';
import { importProducts } from './import-products.mjs';
import { normalizeDomain, sameDomain } from './lib/domain.mjs';
import { getAccessToken, storedToken, hasClientCredentials } from './lib/shopify-token.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(script, args) {
    execFileSync(process.execPath, [resolve(root, 'scripts', script), ...args], {
        stdio: 'inherit',
        cwd: process.cwd(),
    });
}

// Re-exported so tests can cover the comparison without importing the module
// through its CLI entry point.
export { normalizeDomain, sameDomain };

// Fill in the ids Shopify assigned, leaving every other field untouched. The
// config is hand-edited between runs, so rewriting it from scratch would drop
// the operator's edits.
export function applyVariantIds(config, results) {
    let changed = 0;
    for (const product of config.products) {
        const result = results.find((r) => r.handle === product.handle);
        if (!result?.variantId) continue;
        if (product.variantId === result.variantId) continue;
        product.variantId = result.variantId;
        changed += 1;
    }
    return changed;
}

async function main() {
    const arg = process.argv[2];
    if (!arg) {
        console.error('Usage: node scripts/deploy.mjs <config.json> [--dry-run]');
        console.error('');
        console.error('  Runs the store-facing half of the pipeline for one client:');
        console.error('    import products -> record variant ids -> rebuild -> QA -> push theme');
        console.error('');
        console.error('  Needs SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_TOKEN and a theme token in .env.');
        console.error('  The theme is pushed unpublished. Nothing is ever published.');
        process.exit(2);
    }

    const dryRun = process.argv.includes('--dry-run');
    const force = process.argv.includes('--force');
    const configPath = resolve(process.cwd(), arg);
    if (!existsSync(configPath)) {
        console.error(`✗ no such file: ${configPath}`);
        process.exit(1);
    }

    loadEnv();
    // Either credential shape is accepted. A stored token is the only one that
    // works for a client's store; client credentials cover a store in the same
    // organization as the Dev Dashboard app.
    if (!storedToken() && !hasClientCredentials()) {
        console.error('✗ No Shopify credentials. Set one of these in .env:');
        console.error('  SHOPIFY_ADMIN_TOKEN                        (authorization code grant)');
        console.error('  SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET  (Dev Dashboard app)');
        process.exit(1);
    }

    const { config, errors } = loadAndValidate(configPath);
    if (errors.length) {
        console.error('✗ config invalid:');
        for (const e of errors) console.error(`  ${e}`);
        process.exit(1);
    }

    // One .env serves every client, but each config names its own store. The
    // import used to read SHOPIFY_STORE_DOMAIN while the theme push read
    // config.store.domain, so with two clients the products of one could land
    // in the store of the other. The config is the target; .env must agree.
    const domain = config.store.domain;
    const envDomain = process.env.SHOPIFY_STORE_DOMAIN;
    if (envDomain && !sameDomain(envDomain, domain)) {
        console.error(`✗ SHOPIFY_STORE_DOMAIN is ${envDomain} but this config targets ${domain}.`);
        console.error('  Refusing to write to a store the config does not name.');
        console.error(`  Set SHOPIFY_STORE_DOMAIN=${domain}, or fix the config.`);
        process.exit(1);
    }
    // Importing into the wrong store is unrecoverable in the sense that the
    // operator has to clean it up by hand, so state the target before writing.
    console.log(`\n== deploy ${config.client.displayName} -> ${domain} ==\n`);
    if (dryRun) {
        console.log('-- dry run: nothing will be sent to Shopify --\n');
        console.log(`  would build, run QA, then import ${config.products.length} product(s) into ${domain}`);
        console.log(`  would rebuild and push theme/ unpublished`);
        return;
    }

    // Build and check QA before importing. An import is a write to a real
    // store: a product with a TODO title or a 0.00 price becomes junk the
    // operator has to delete by hand. Refusing here is cheaper than cleaning up.
    console.log('-- build --');
    run('build-store.mjs', [configPath]);

    console.log('\n-- QA before import --');
    let blocked = false;
    try {
        // Variant ids are what the import produces, so the pre-import check
        // cannot demand them. Without this flag a brand new landing store is
        // blocked on a value that only exists after the step being blocked.
        run('qa-check.mjs', [configPath, '--no-require-variants']);
    } catch {
        blocked = true;
    }
    if (blocked && !force) {
        console.error('\n✗ QA reports blockers, so nothing was sent to Shopify.');
        console.error('  Fix the blockers above, or pass --force to import anyway.');
        process.exit(1);
    }
    if (blocked) {
        console.warn('\n⚠ QA reports blockers; importing anyway because of --force.');
    }

    console.log('\n-- import products --');
    // Resolve the token here rather than at startup: the client credentials
    // request has to address this client's shop, which is only known after the
    // config is read.
    let token;
    try {
        token = await getAccessToken({ domain });
    } catch (error) {
        console.error(`✗ ${error.message}`);
        process.exit(1);
    }
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
    if (ok !== results.length) {
        console.error('✗ some products failed; fix them before pushing the theme.');
        process.exit(1);
    }

    const changed = applyVariantIds(config, results);
    if (changed) {
        writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
        console.log(`✓ recorded ${changed} variant id(s) in ${configPath}`);
    }

    console.log('\n-- rebuild with variant ids --');
    run('build-store.mjs', [configPath]);

    console.log('\n-- QA --');
    let blockers = 0;
    try {
        run('qa-check.mjs', [configPath]);
    } catch {
        blockers += 1;
    }

    console.log('\n-- push theme (unpublished) --');
    // push-theme exits non-zero when the CLI is missing or rejects the token.
    // Uncaught, execFileSync prints a stack trace that reads as a crash in the
    // factory rather than a fixable setup problem.
    let pushed = false;
    try {
        run('push-theme.mjs', [configPath]);
        pushed = true;
    } catch {
        console.error('\n✗ the theme push failed. See the message above.');
    }

    console.log('\n== done ==');
    if (!pushed) {
        console.log('  The products were imported and the config was updated, but the');
        console.log('  theme was not pushed. Fix the theme problem, then re-run:');
        console.log(`    node scripts/push-theme.mjs ${configPath}`);
        console.log('  Re-running deploy is safe: the import is idempotent by handle.');
    } else if (blockers) {
        console.log('  QA still reports blockers. Fix them, then re-run this command.');
        console.log('  The theme is pushed but unpublished, so nothing is live.');
    } else {
        console.log('  QA is clean. The theme is pushed but unpublished.');
        console.log('  Review it in Shopify, then publish when you are ready.');
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
