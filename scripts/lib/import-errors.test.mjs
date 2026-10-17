import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeHttpError } from '../import-products.mjs';

// Shopify's own message for a rejected token is "Invalid API key or access
// token", which does not name the variable to fix. These assert the operator
// gets told what to do.
test('a rejected token points at the token variable', () => {
    const message = describeHttpError(401, 'x.myshopify.com', '{}');
    assert.match(message, /SHOPIFY_ADMIN_TOKEN/);
});

test('403 is treated as a token problem too', () => {
    const message = describeHttpError(403, 'x.myshopify.com', '{}');
    assert.match(message, /SHOPIFY_ADMIN_TOKEN/);
});

test('a missing store points at the domain variable', () => {
    const message = describeHttpError(404, 'x.myshopify.com', '');
    assert.match(message, /SHOPIFY_STORE_DOMAIN/);
});

test('rate limiting says to retry rather than blaming the config', () => {
    const message = describeHttpError(429, 'x.myshopify.com', '');
    assert.match(message, /again/i);
});

test('an unknown status still includes the body, truncated', () => {
    const message = describeHttpError(500, 'x.myshopify.com', 'x'.repeat(500));
    assert.match(message, /HTTP 500/);
    assert.ok(message.length < 300, 'the body must be truncated');
});
