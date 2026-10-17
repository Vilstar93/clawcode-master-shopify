import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = readFileSync(resolve(root, 'scripts/push-theme.mjs'), 'utf8');

// These assert on the source rather than running the CLI, because the bug only
// shows on Windows and CI runs on Linux. The operator is on Windows, so a
// regression here is invisible until it breaks a client trial.

test('the Shopify CLI is spawned through a shell on Windows', () => {
    // On Windows `shopify` is a .cmd shim, and Node refuses to spawn a .cmd
    // without a shell. With shell: false an installed CLI reports as missing.
    assert.match(source, /shell:\s*process\.platform === 'win32'/,
        'spawning shopify.cmd without a shell breaks on Windows');
    assert.doesNotMatch(source, /shell:\s*false/,
        'shell: false is the Windows bug this guards against');
});

test('the theme path passed to the CLI cannot contain a space', () => {
    // Under a shell Node does not quote arguments, so an absolute path with a
    // space (C:\Users\First Last\...) would split into two arguments.
    const match = source.match(/--path',\s*'([^']+)'/);
    assert.ok(match, 'the --path argument should be a literal');
    assert.equal(match[1], 'theme', 'the theme path must be relative');
    assert.doesNotMatch(source, /--path',\s*themeDir/, 'themeDir is an absolute path and may contain a space');
});

test('the CLI runs from the repository root', () => {
    // The relative --path only resolves if the working directory is the root.
    assert.match(source, /cwd:\s*root/, 'the CLI must run from the repo root');
});
