import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transliterate, slugify } from './slug.mjs';
import { configFromRequest, outstandingWork, missingRequestFields } from '../from-request.mjs';
import { validate } from './validate.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const schema = JSON.parse(readFileSync(resolve(root, 'config/client.schema.json'), 'utf8'));

const REQUEST = {
    legalName: 'Кибритена Кутия ЕООД',
    eik: '104532902',
    vatId: 'BG104532902',
    address: 'ул. Витоша 15, София 1000',
    contactName: 'Иван Иванов',
    email: 'ivan@kibritena.bg',
    phone: '+359881234567',
    niche: 'Ръчно изработени свещи',
    domain: 'kibritena.bg',
    consent: true,
};

test('Cyrillic is transliterated, not dropped', () => {
    assert.equal(transliterate('Кибритена Кутия'), 'kibritena kutiya');
    // The digraphs are the part that is easy to get wrong.
    assert.equal(transliterate('жълъд'), 'zhalad');
    assert.equal(transliterate('Щъркел'), 'shtarkel');
    assert.equal(transliterate('Юлия'), 'yuliya');
});

test('a slug is valid for the schema', () => {
    const slug = slugify('Кибритена Кутия ЕООД');
    assert.match(slug, /^[a-z0-9][a-z0-9-]{1,40}$/, `${slug} must satisfy the slug pattern`);
});

test('the legal suffix does not leak into the slug', () => {
    assert.equal(slugify('Примерна Фирма ЕООД'), slugify('Примерна Фирма ООД'));
});

test('a name that transliterates to nothing still yields a usable slug', () => {
    // "ЕООД" alone strips to empty; without the fallback this produced an empty
    // slug that failed the schema with a pattern error nobody could act on.
    const slug = slugify('ЕООД');
    assert.match(slug, /^[a-z0-9][a-z0-9-]{1,40}$/);
});

test('a one-letter name is padded to the minimum length', () => {
    assert.match(slugify('А'), /^[a-z0-9][a-z0-9-]{1,40}$/);
});

test('a generated config satisfies the schema', () => {
    const config = configFromRequest(REQUEST);
    assert.deepEqual(validate(config, schema), [], 'no schema errors');
});

test('client data is carried through, not invented', () => {
    const { client } = configFromRequest(REQUEST);
    assert.equal(client.legalName, 'Кибритена Кутия ЕООД');
    assert.equal(client.email, 'ivan@kibritena.bg');
    assert.equal(client.eik, '104532902');
    assert.equal(client.vatId, 'BG104532902');
});

test('the display name drops the legal suffix', () => {
    assert.equal(configFromRequest(REQUEST).client.displayName, 'Кибритена Кутия');
});

test('a structured address is split into its parts', () => {
    const { address } = configFromRequest(REQUEST).client;
    assert.deepEqual(address, { street: 'ул. Витоша 15', city: 'София', postalCode: '1000', country: 'BG' });
});

test('an unparseable address is kept whole rather than guessed', () => {
    const { address } = configFromRequest({ ...REQUEST, address: 'някъде в България' }).client;
    assert.equal(address.street, 'някъде в България');
    assert.equal(address.city, '', 'an unknown city must stay empty, not be invented');
});

test('a missing domain falls back to a myshopify address', () => {
    const { store } = configFromRequest({ ...REQUEST, domain: '' });
    assert.equal(store.domain, 'kibritena-kutiya.myshopify.com');
});

test('a supplied domain is used as-is', () => {
    assert.equal(configFromRequest(REQUEST).store.domain, 'kibritena.bg');
});

test('the niche reaches the store', () => {
    assert.equal(configFromRequest(REQUEST).store.niche, 'Ръчно изработени свещи');
});

test('a request missing required fields is reported, not silently filled', () => {
    // A hand-written request file may omit the niche or email. Filling those
    // with a placeholder would produce a store with a fake contact address, so
    // the command must refuse and name the fields.
    const missing = missingRequestFields({ legalName: 'Тест ООД' });
    assert.deepEqual(missing, ['eik', 'email', 'niche']);
});

test('a complete request reports nothing missing', () => {
    assert.deepEqual(missingRequestFields(REQUEST), []);
});

test('outstanding work lists every placeholder the operator must replace', () => {
    const todo = outstandingWork(configFromRequest(REQUEST));
    for (const expected of ['brand.tagline', 'products[0].title', 'products[0].price',
        'products[0].description', 'products[0].images', 'store.usps', 'collections', 'integrations.ga4']) {
        assert.ok(todo.includes(expected), `${expected} should be reported as outstanding`);
    }
});

test('a finished config reports no outstanding work', () => {
    const config = configFromRequest(REQUEST);
    config.brand.tagline = 'Ръчно изработени свещи от София';
    config.store.usps = ['Безплатна доставка над 100 лв.'];
    config.store.domain = 'kibritena.bg';
    config.collections = [{ handle: 'sveshti', title: 'Свещи', products: [config.products[0].handle] }];
    config.integrations.ga4 = 'G-ABC123';
    Object.assign(config.products[0], {
        title: 'Свещ Лавандула',
        price: 24.9,
        shortDescription: 'Ароматна свещ с лавандула.',
        description: 'Ръчно изработена соева свещ.',
        images: ['clients/kibritena-kutiya/products/1-1.jpg'],
    });
    assert.deepEqual(outstandingWork(config), []);
});
