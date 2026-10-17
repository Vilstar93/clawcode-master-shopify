#!/usr/bin/env node
// One client, one command.
//
// Takes a portal request (a line from the portal's data/requests.jsonl, or a
// JSON file with the same shape) and runs the whole preparation pipeline:
// request -> config -> validate -> build -> QA. It stops at the first failure
// so a broken config never reaches the build step, and it prints the QA
// blockers at the end.
//
// It deliberately does NOT touch Shopify. Pushing a theme and importing
// products need credentials and a real store, so those stay explicit, separate
// commands that the operator runs after reviewing the package.
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { configFromRequest, outstandingWork, missingRequestFields } from './from-request.mjs';
import { validate } from './lib/validate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(readFileSync(resolve(root, 'config/client.schema.json'), 'utf8'));

function run(script, args) {
    execFileSync(process.execPath, [resolve(root, 'scripts', script), ...args], {
        stdio: 'inherit',
        cwd: process.cwd(),
    });
}

function main() {
    const arg = process.argv[2];
    if (!arg) {
        console.error('Usage: node scripts/new-client.mjs <request.json> [--force]');
        console.error('');
        console.error('  Runs the full pipeline for one client:');
        console.error('    request -> config -> validate -> build -> QA');
        console.error('');
        console.error('  It writes config/<slug>.json and dist/<slug>/.');
        console.error('  It does not touch Shopify; pushing and importing stay manual.');
        process.exit(2);
    }

    const force = process.argv.includes('--force');
    const inputPath = resolve(process.cwd(), arg);
    if (!existsSync(inputPath)) {
        console.error(`✗ no such file: ${inputPath}`);
        process.exit(1);
    }

    let request;
    try {
        request = JSON.parse(readFileSync(inputPath, 'utf8'));
    } catch (error) {
        console.error(`✗ ${inputPath} is not valid JSON: ${error.message}`);
        process.exit(1);
    }

    const missing = missingRequestFields(request);
    if (missing.length) {
        console.error(`✗ request is missing: ${missing.join(', ')}`);
        process.exit(1);
    }

    const config = configFromRequest(request);
    const configPath = resolve(process.cwd(), 'config', `${config.client.slug}.json`);

    if (existsSync(configPath) && !force) {
        console.error(`✗ ${configPath} already exists.`);
        console.error('  Use --force to overwrite, or edit the existing config by hand.');
        process.exit(1);
    }

    console.log(`\n== ${config.client.displayName} (${config.client.slug}) ==\n`);

    const errors = validate(config, schema);
    if (errors.length) {
        console.error('✗ generated config is invalid:');
        for (const e of errors) console.error(`  ${e}`);
        process.exit(1);
    }

    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    console.log(`✓ config written to ${configPath}\n`);

    console.log('-- build --');
    run('build-store.mjs', [configPath]);

    console.log('\n-- QA --');
    // qa-check exits non-zero when blockers exist. That is expected for a fresh
    // client, so it must not abort the pipeline: the operator still needs the
    // package and the blocker list.
    try {
        run('qa-check.mjs', [configPath]);
    } catch {
        // blockers reported; the summary below explains them
    }

    const todo = outstandingWork(config);
    console.log(`\n== next steps ==`);
    console.log(`  ${todo.length} field(s) need a real value:`);
    for (const field of todo) console.log(`    - ${field}`);
    console.log('');
    console.log(`  Edit ${configPath}, then re-run:`);
    console.log(`    node scripts/build-store.mjs ${configPath}`);
    console.log(`    node scripts/qa-check.mjs    ${configPath}`);
    console.log('');
    console.log('  When QA is clean, connect the store:');
    console.log('    node scripts/import-products.mjs ' + configPath);
    console.log('    node scripts/push-theme.mjs      ' + configPath);
}

main();
