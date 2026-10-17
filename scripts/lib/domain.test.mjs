import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDomain, sameDomain } from './domain.mjs';

test('case and scheme do not make two stores different', () => {
    // The config and .env are typed by hand at different times.
    assert.ok(sameDomain('Shop.myshopify.com', 'shop.myshopify.com'));
    assert.ok(sameDomain('https://shop.myshopify.com', 'shop.myshopify.com'));
    assert.ok(sameDomain('shop.myshopify.com/', 'shop.myshopify.com'));
    assert.ok(sameDomain('  shop.myshopify.com  ', 'shop.myshopify.com'));
});

test('two different stores are not the same', () => {
    // This is the check that stops one client's products landing in another's.
    assert.ok(!sameDomain('zelena-kashta.myshopify.com', 'meden-zanat.myshopify.com'));
});

test('a store whose name is a prefix of another is still different', () => {
    // A substring match here would let "shop" match "shop2".
    assert.ok(!sameDomain('shop.myshopify.com', 'shop2.myshopify.com'));
});

test('an empty value never matches a real domain', () => {
    assert.equal(normalizeDomain(''), '');
    assert.equal(normalizeDomain(undefined), '');
    assert.ok(!sameDomain('', 'shop.myshopify.com'));
    assert.ok(!sameDomain(undefined, 'shop.myshopify.com'));
});

test('an unset .env domain is handled by the caller, not treated as a match', () => {
    // deploy skips the comparison when the variable is absent, so the caller
    // decides. This pins the helper's behaviour for that case.
    assert.ok(sameDomain('', ''));
});
