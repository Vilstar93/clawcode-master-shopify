import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { qa } from '../qa-check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const example = JSON.parse(readFileSync(resolve(root, 'config/client.example.json'), 'utf8'));

// QA reads the built package to check the CSV and legal pages exist. These
// tests only exercise the config-driven checks, so a path that does not exist
// is fine: those checks fail, which the tests below ignore.
const NO_DIST = resolve(root, 'dist/__qa-test-does-not-exist__');

const find = (checks, name) => checks.find((c) => c.name === name);
const clone = () => JSON.parse(JSON.stringify(example));

function completed(config) {
    config.brand.tagline = 'Ръчно изработени продукти от България';
    config.store.usps = ['Безплатна доставка над 100 лв.'];
    config.integrations.ga4 = 'G-TEST00000';
    Object.assign(config.products[0], {
        title: 'Свещ Лавандула',
        price: 24.9,
        description: 'Ръчно изработена соева свещ.',
        images: ['clients/x/products/1-1.jpg'],
    });
    return config;
}

test('a description that is still a TODO does not count as a description', () => {
    // The old check passed any non-empty string, so a generated store could be
    // handed over with "TODO: пълно описание" as its product copy.
    const config = clone();
    config.products[0].description = 'TODO: пълно описание';
    assert.equal(find(qa(config, NO_DIST), 'every product has a description').ok, false);
});

test('an empty description is still caught', () => {
    const config = clone();
    config.products[0].description = '';
    assert.equal(find(qa(config, NO_DIST), 'every product has a description').ok, false);
});

test('a real description passes', () => {
    const config = clone();
    config.products[0].description = 'Ръчно изработена соева свещ с лавандула.';
    assert.equal(find(qa(config, NO_DIST), 'every product has a description').ok, true);
});

test('a price of zero is a blocker', () => {
    // Nothing checked price at all, so a 0.00 product could ship.
    const config = clone();
    config.products[0].price = 0;
    assert.equal(find(qa(config, NO_DIST), 'every product has a price above zero').ok, false);
});

test('a missing price is a blocker', () => {
    const config = clone();
    delete config.products[0].price;
    assert.equal(find(qa(config, NO_DIST), 'every product has a price above zero').ok, false);
});

test('a positive price passes', () => {
    const config = clone();
    config.products[0].price = 0.01;
    assert.equal(find(qa(config, NO_DIST), 'every product has a price above zero').ok, true);
});

test('a placeholder product title is a blocker', () => {
    const config = clone();
    config.products[0].title = 'TODO: име на продукт';
    assert.equal(find(qa(config, NO_DIST), 'no placeholder product titles').ok, false);
});

test('a placeholder tagline is a blocker', () => {
    const config = clone();
    config.brand.tagline = 'TODO: tagline';
    assert.equal(find(qa(config, NO_DIST), 'brand tagline is real').ok, false);
});

test('a landing store with unlinked products is a blocker', () => {
    // Without variant ids the bundle ships an empty product list and every buy
    // button fails. The store looks ready and sells nothing.
    const config = completed(clone());
    config.store.type = 'landing';
    config.products = [config.products[0]];
    delete config.products[0].variantId;
    const check = find(qa(config, NO_DIST), 'landing products are linked to Shopify variants');
    assert.equal(check.ok, false);
    assert.match(check.detail, /0\/1/);
});

test('a landing store with linked products passes', () => {
    const config = completed(clone());
    config.store.type = 'landing';
    config.products = [config.products[0]];
    config.products[0].variantId = '59905305018713';
    assert.equal(find(qa(config, NO_DIST), 'landing products are linked to Shopify variants').ok, true);
});

test('a partial link is still a blocker', () => {
    const config = completed(clone());
    config.store.type = 'landing';
    config.products[0].variantId = '59905305018713';
    config.products.push({ ...config.products[0], handle: 'second', slug: 'second' });
    delete config.products[1].variantId;
    assert.equal(find(qa(config, NO_DIST), 'landing products are linked to Shopify variants').ok, false);
});

test('the variant check does not apply to non-landing stores', () => {
    const config = completed(clone());
    config.store.type = 'store';
    delete config.products[0].variantId;
    assert.equal(find(qa(config, NO_DIST), 'landing products are linked to Shopify variants'), undefined);
});

test('the example config documents the gaps rather than hiding them', () => {
    // The shipped example is a template, not a finished store: it is a landing
    // store with one product unlinked and no GA4. QA must say so. If someone
    // quietly "fixes" the example, this test notices, because a template that
    // looks finished teaches the wrong thing.
    const blockers = qa(clone(), resolve(root, 'dist/example-firm')).filter((c) => !c.ok);
    const names = blockers.map((b) => b.name);
    assert.ok(names.includes('landing products are linked to Shopify variants'),
        'the example should show an unlinked product');
    assert.ok(names.includes('GA4 configured'), 'the example should show GA4 as unset');
});
