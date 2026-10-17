import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnv } from './env.mjs';

function envFile(contents) {
    const dir = mkdtempSync(join(tmpdir(), 'env-'));
    const path = join(dir, '.env');
    writeFileSync(path, contents);
    return path;
}

test('values from the file reach process.env', () => {
    const key = 'FACTORY_TEST_VALUE';
    delete process.env[key];
    loadEnv(envFile(`${key}=hello\n`));
    assert.equal(process.env[key], 'hello');
    delete process.env[key];
});

test('a missing file is not an error', () => {
    const loaded = loadEnv(join(tmpdir(), 'definitely-absent', '.env'));
    assert.deepEqual(loaded, {});
});

test('an exported variable is not overwritten by the file', () => {
    const key = 'FACTORY_TEST_WINS';
    process.env[key] = 'from-shell';
    loadEnv(envFile(`${key}=from-file\n`));
    assert.equal(process.env[key], 'from-shell');
    delete process.env[key];
});

test('quotes around a value are stripped', () => {
    const key = 'FACTORY_TEST_QUOTED';
    delete process.env[key];
    loadEnv(envFile(`${key}="a b"\n`));
    assert.equal(process.env[key], 'a b');
    delete process.env[key];
});

test('Windows line endings do not leak into the value', () => {
    // A .env written by Notepad ends lines with \r\n. Without stripping the \r
    // the token would carry a trailing carriage return and Shopify would reject
    // it as invalid, which is very hard to see.
    const key = 'FACTORY_TEST_CRLF';
    delete process.env[key];
    loadEnv(envFile(`${key}=abc123\r\n`));
    assert.equal(process.env[key], 'abc123');
    delete process.env[key];
});

test('comments and blank lines are skipped', () => {
    const key = 'FACTORY_TEST_COMMENT';
    delete process.env[key];
    const loaded = loadEnv(envFile(`# a comment\n\n${key}=yes\n`));
    assert.equal(loaded[key], 'yes');
    delete process.env[key];
});
