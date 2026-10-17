import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyVariantIds } from '../deploy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function configWith(products) {
    return { client: { slug: 'x' }, products };
}

test('variant ids from Shopify are written into the matching product', () => {
    const config = configWith([{ handle: 'a', title: 'A' }, { handle: 'b', title: 'B' }]);
    const changed = applyVariantIds(config, [
        { handle: 'a', variantId: '111' },
        { handle: 'b', variantId: '222' },
    ]);
    assert.equal(changed, 2);
    assert.equal(config.products[0].variantId, '111');
    assert.equal(config.products[1].variantId, '222');
});

test('a product Shopify did not return an id for is left alone', () => {
    // Clearing the field would discard an id the operator set by hand.
    const config = configWith([{ handle: 'a', variantId: '999' }]);
    const changed = applyVariantIds(config, [{ handle: 'a' }]);
    assert.equal(changed, 0);
    assert.equal(config.products[0].variantId, '999');
});

test('an unchanged id does not count as a change', () => {
    // The caller only rewrites the config file when something changed, so a
    // spurious change would rewrite a hand-edited file for nothing.
    const config = configWith([{ handle: 'a', variantId: '111' }]);
    assert.equal(applyVariantIds(config, [{ handle: 'a', variantId: '111' }]), 0);
});

test('a result for an unknown handle is ignored', () => {
    const config = configWith([{ handle: 'a' }]);
    assert.equal(applyVariantIds(config, [{ handle: 'ghost', variantId: '1' }]), 0);
    assert.equal(config.products[0].variantId, undefined);
});

test('deploy refuses to run without credentials', () => {
    // The usage text is the only documentation an operator reads mid-trial.
    // Both credential shapes must be named: a Dev Dashboard app has no token to
    // paste, and an operator who is told to set SHOPIFY_ADMIN_TOKEN alone will
    // look for a token that Shopify stopped showing in January 2026.
    const source = readFileSync(resolve(root, 'scripts/deploy.mjs'), 'utf8');
    assert.match(source, /SHOPIFY_ADMIN_TOKEN/);
    assert.match(source, /SHOPIFY_CLIENT_ID/);
    assert.match(source, /SHOPIFY_CLIENT_SECRET/);
    assert.match(source, /unpublished/, 'the operator must be told nothing is published');
});

test('deploy refuses to import while QA reports blockers', () => {
    // An import writes to a real store. Importing a product whose title is
    // "TODO" or whose price is 0 leaves junk the operator must delete by hand,
    // so QA has to gate the import, not follow it.
    const source = readFileSync(resolve(root, 'scripts/deploy.mjs'), 'utf8');
    const qaAt = source.indexOf("run('qa-check.mjs'");
    const importAt = source.indexOf('await importProducts(');
    assert.ok(qaAt > 0 && importAt > 0, 'both steps should exist');
    assert.ok(qaAt < importAt, 'QA must run before the import');
    assert.match(source, /nothing was sent to Shopify/, 'the refusal should say nothing was sent');
    assert.match(source, /--force/, 'there should be an escape hatch');
});

test('deploy imports before pushing the theme', () => {
    // The theme embeds the variant ids, so pushing first would ship a bundle
    // whose buy buttons point at nothing.
    const source = readFileSync(resolve(root, 'scripts/deploy.mjs'), 'utf8');
    const importAt = source.indexOf("run('build-store.mjs'");
    const pushAt = source.indexOf("run('push-theme.mjs'");
    assert.ok(importAt > 0 && pushAt > 0, 'both steps should exist');
    assert.ok(importAt < pushAt, 'the rebuild must happen before the theme push');
});
