import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateLanding } from '../gen-landing.mjs';

// The landing page is the shop front a client's customers see. These run the
// real generator, so a copy change is covered without keeping a copy of the
// copy in the test.

function build(locale) {
    const config = {
        client: {
            slug: 'acme',
            displayName: 'Acme GmbH',
            locale,
            currency: 'EUR',
        },
        brand: { tagline: 'Ehrliche Beratung' },
        store: { type: 'landing', usps: ['Festpreise'] },
        products: [{ handle: 'p1', title: 'Produkt', price: 10, shortDescription: 'x' }],
        collections: [],
    };
    // generateLanding writes into a dist directory; point it at a temp one so
    // the test does not leave artifacts in the repository.
    const dir = mkdtempSync(join(tmpdir(), 'landing-'));
    const { written } = generateLanding(config, { distDir: dir });
    const html = readFileSync(join(dir, 'acme', 'landing', 'index.html'), 'utf8');
    rmSync(dir, { recursive: true, force: true });
    return { html, files: written };
}

test('a German store gets German copy, not English', () => {
    // This was a `bg ? ... : ...` ternary, so every locale except Bulgarian
    // silently rendered English. A German client's shop front was in English.
    const { html } = build('de-DE');
    assert.match(html, /Jetzt kaufen/, 'the buy button should be German');
    assert.match(html, /So bestellen Sie/, 'the how-to heading should be German');
    assert.doesNotMatch(html, /Buy now/, 'no English buy button should remain');
    assert.doesNotMatch(html, /How to order/, 'no English heading should remain');
});

test('a Bulgarian store still gets Bulgarian copy', () => {
    const { html } = build('bg-BG');
    assert.match(html, /Купи сега/);
    assert.match(html, /Как да поръчам/);
});

test('an unknown locale falls back to English rather than blank text', () => {
    const { html } = build('fr-FR');
    assert.match(html, /Buy now/, 'an unsupported language must still render');
});

test('a store with no hero image gets no hero block', () => {
    // The template emitted <img src="/assets/hero.jpg"> unconditionally, so a
    // store with no assets showed a 404 in the first thing a visitor saw, and an
    // empty .hero-media left a framed grey box next to the headline.
    const { html } = build('de-DE');
    assert.doesNotMatch(html, /<img src="\/assets\/hero\.jpg"/, 'no broken hero image');
    assert.doesNotMatch(html, /class="hero-media"><\/div>/, 'no empty hero frame');
});

test('the page declares the client language', () => {
    const { html } = build('de-DE');
    assert.match(html, /<html lang="de"/, 'the lang attribute drives hyphenation and screen readers');
});
