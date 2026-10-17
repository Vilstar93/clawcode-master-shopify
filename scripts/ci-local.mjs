#!/usr/bin/env node
// Runs the CI workflow locally, step by step, from a clean checkout.
//
// This exists because the workflow file is the source of truth and a local
// script that reimplements it drifts. It reads .github/workflows/factory.yml
// and runs each step's `run:` command in order.
//
// It lives in the repository rather than /tmp because it was written to /tmp
// twice, lost to a restart, and rewritten from memory with a worse clean flag
// that deleted .env. Secrets must survive a local run: CI gets them from
// repository secrets, a developer has them only in .env.
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Files that hold credentials or local state. `git clean` removes ignored
// files, which is exactly what these are. They are read before the clean and
// written back after it.
//
// Not `git clean -e <path>`: that flag does not exempt a path from `-X`. It was
// tried, and .env was deleted anyway. A snapshot in memory cannot be defeated by
// a git flag's edge case.
const PRESERVE = ['.env', '.shopify-token-cache.json'];

function snapshotPreserved() {
    const saved = [];
    for (const name of PRESERVE) {
        const path = resolve(root, name);
        try {
            saved.push({ path, content: readFileSync(path) });
        } catch {
            // Not present is the normal case on a fresh checkout.
        }
    }
    return saved;
}

function restorePreserved(saved) {
    for (const { path, content } of saved) writeFileSync(path, content);
}

function stepsFromWorkflow() {
    // No YAML dependency: the workflow only needs `name:` and `run:` pairs, and
    // adding a parser to run the CI is not worth the supply chain.
    const lines = readFileSync(resolve(root, '.github/workflows/factory.yml'), 'utf8').split('\n');
    const steps = [];
    let name = null;
    let run = null;
    let inRun = false;
    let indent = 0;

    for (const line of lines) {
        const nameMatch = line.match(/^\s*-?\s*name:\s*(.+)$/);
        const runMatch = line.match(/^(\s*)run:\s*(\|)?\s*$/);
        const inlineRun = line.match(/^(\s*)run:\s+(\S.*)$/);

        if (inRun) {
            if (line.trim() === '' || line.search(/\S/) >= indent) {
                run += `\n${line.slice(indent)}`;
                continue;
            }
            steps.push({ name, run: run.trim() });
            inRun = false;
            run = null;
        }

        if (nameMatch && line.search(/\S/) <= 8) {
            name = nameMatch[1].trim().replace(/^["']|["']$/g, '');
        } else if (runMatch) {
            indent = runMatch[1].length + 2;
            inRun = true;
            run = '';
        } else if (inlineRun) {
            steps.push({ name, run: inlineRun[2].trim() });
        }
    }
    if (inRun && run !== null) steps.push({ name, run: run.trim() });
    return steps.filter((s) => s.run);
}

// `git clean -fdX` removes ignored files only, so untracked source survives.
// -fdx would also delete the work under test, and a run that removes the new
// module fails on a missing import: a tooling fault that reads as a code bug.
const saved = snapshotPreserved();
console.log(`$ git clean -fdXq   (preserving: ${saved.length ? PRESERVE.join(', ') : 'nothing'})`);
execSync('git clean -fdXq', { cwd: root, stdio: 'inherit' });
restorePreserved(saved);

const steps = stepsFromWorkflow();
if (steps.length === 0) {
    console.error('✗ No steps found in .github/workflows/factory.yml');
    process.exit(1);
}

let failed = 0;
for (const step of steps) {
    const result = spawnSync('bash', ['-c', step.run], {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, GITHUB_ACTIONS: 'true' },
    });
    if (result.status !== 0) {
        console.error(`\nFAIL ${step.name}`);
        failed += 1;
    } else {
        console.log(`ok   ${step.name}`);
    }
}

console.log();
if (failed) {
    console.error(`${failed} step(s) failed`);
    process.exit(1);
}
console.log('ALL CI STEPS PASS');
