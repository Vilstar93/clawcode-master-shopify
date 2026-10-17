import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// The checkout is the path that takes a customer's money, and it had no test.
// It is generated from a template, so testing the template is testing the real
// code rather than a copy that can drift.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);

// Render the template the same way gen-landing does: substitute the {{vars}}
// and leave the generated module importable.
function loadCheckout() {
    const tpl = readFileSync(join(root, 'templates', 'landing', 'api', 'buy.js.tpl'), 'utf8');
    const vars = {
        storeDomain: 'example-firm.myshopify.com',
        msgMethodNotAllowed: 'Методът не е разрешен.',
        msgUnknownProduct: 'Неизвестен продукт.',
        msgNoVariant: 'Продуктът не е свързан с Shopify.',
        msgCheckoutFailed: 'Checkout-ът не можа да започне. Опитайте отново.',
    };
    const rendered = tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

    const dir = mkdtempSync(join(tmpdir(), 'buy-'));
    writeFileSync(join(dir, 'buy.js'), rendered);
    writeFileSync(
        join(dir, '_products.js'),
        "module.exports = [{ slug: 't-shirt', title: 'Тениска', price: 20, variantId: 'gid://shopify/ProductVariant/12345' }];"
    );
    delete require.cache[join(dir, 'buy.js')];
    return require(join(dir, 'buy.js'));
}

function mockRes() {
    return {
        statusCode: 200, body: undefined,
        setHeader() {},
        status(c) { this.statusCode = c; return this; },
        json(p) { this.body = p; return this; },
    };
}

test('a valid slug produces a checkout URL for the right variant', () => {
    const { buildCartUrl } = loadCheckout();
    const url = buildCartUrl('gid://shopify/ProductVariant/12345', 1);
    assert.match(url, /^https:\/\/example-firm\.myshopify\.com\/cart\/12345:1$/);
});

test('a bare numeric variant id is accepted', () => {
    const { buildCartUrl } = loadCheckout();
    assert.match(buildCartUrl('12345', 2), /\/cart\/12345:2$/);
});

test('a nonsense variant id is refused rather than building a broken URL', () => {
    const { buildCartUrl } = loadCheckout();
    assert.throws(() => buildCartUrl('not-a-variant', 1), /invalid variant id/);
});

test('quantity is coerced to a sane value', () => {
    const { buildCartUrl } = loadCheckout();
    // A zero, negative, fractional or non-numeric quantity must not produce
    // /cart/12345:0, which Shopify would reject at the checkout step after the
    // customer has already committed.
    for (const qty of [0, -5, 1.5, 'abc', undefined, null]) {
        assert.match(buildCartUrl('12345', qty), /:1$/, `quantity ${qty} should fall back to 1`);
    }
    assert.match(buildCartUrl('12345', 7), /:7$/);
});

test('the store domain is normalised from a full URL', () => {
    // SHOPIFY_STORE_DOMAIN is sometimes pasted as https://store.myshopify.com/.
    // Left as-is it would build https://https://... and break every checkout.
    process.env.SHOPIFY_STORE_DOMAIN = 'https://pasted.myshopify.com/';
    try {
        const { buildCartUrl } = loadCheckout();
        const url = buildCartUrl('12345', 1);
        assert.match(url, /^https:\/\/pasted\.myshopify\.com\//);
        assert.ok(!url.includes('https://https'), 'the scheme must not be doubled');
    } finally {
        delete process.env.SHOPIFY_STORE_DOMAIN;
    }
});

test('cart properties are attached, trimmed and bounded', () => {
    const { buildCartUrl } = loadCheckout();
    const url = buildCartUrl('12345', 1, { 'Име': '  Иван  ', 'празно': '   ' });
    const encoded = new URL(url).searchParams.get('properties');
    assert.ok(encoded, 'properties should be present');
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    assert.equal(decoded['Име'], 'Иван', 'values are trimmed');
    assert.ok(!('празно' in decoded), 'blank values are dropped');
});

test('no properties means no properties parameter', () => {
    const { buildCartUrl } = loadCheckout();
    assert.equal(new URL(buildCartUrl('12345', 1, {})).searchParams.get('properties'), null);
});

test('a non-POST request is refused', async () => {
    const handler = loadCheckout();
    const res = mockRes();
    await handler({ method: 'GET' }, res);
    assert.equal(res.statusCode, 405);
});

test('an unknown slug is refused', async () => {
    const handler = loadCheckout();
    const res = mockRes();
    await handler({ method: 'POST', body: { slug: 'does-not-exist' } }, res);
    assert.equal(res.statusCode, 400);
});

test('a known slug returns a checkout URL', async () => {
    const handler = loadCheckout();
    const res = mockRes();
    await handler({ method: 'POST', body: { slug: 't-shirt', quantity: 3 } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body.url, /\/cart\/12345:3$/);
});

test('a malformed JSON body does not throw', async () => {
    const handler = loadCheckout();
    const res = mockRes();
    await handler({ method: 'POST', body: '{broken' }, res);
    assert.equal(res.statusCode, 502, 'it must answer, not crash');
});
