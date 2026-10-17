import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyBrand, readableOn, schemeFor } from './theme-brand.mjs';

function dawnSettings() {
    return {
        current: 'Dawn',
        presets: {
            Dawn: {
                logo_width: 90,
                color_schemes: {
                    'scheme-1': { settings: { background: '#FFFFFF', text: '#121212', button: '#121212' } },
                    'scheme-2': { settings: { background: '#F3F3F3', text: '#121212' } },
                    'scheme-3': { settings: { background: '#242833', text: '#FFFFFF' } },
                    'scheme-4': { settings: { background: '#121212', text: '#FFFFFF' } },
                    'scheme-5': { settings: { background: '#334FB4', text: '#FFFFFF' } },
                },
            },
        },
    };
}

const brand = { tagline: 'Ръчно', primaryColor: '#0F4C81', secondaryColor: '#F4A261' };

test('the brand colour reaches the schemes', () => {
    const out = applyBrand(dawnSettings(), brand);
    const schemes = out.presets.Dawn.color_schemes;
    assert.equal(schemes['scheme-1'].settings.button, '#0F4C81');
    assert.equal(schemes['scheme-5'].settings.background, '#0F4C81');
});

test('settings that are not colours are left alone', () => {
    const out = applyBrand(dawnSettings(), brand);
    assert.equal(out.presets.Dawn.logo_width, 90);
});

test('the input is not mutated', () => {
    // push-theme reads the file and builds the pushed copy. A mutated source
    // would leak one client's colours into the next build in the same process.
    const input = dawnSettings();
    applyBrand(input, brand);
    assert.equal(input.presets.Dawn.color_schemes['scheme-1'].settings.button, '#121212');
});

test('a brand with no primary colour changes nothing', () => {
    const input = dawnSettings();
    assert.deepEqual(applyBrand(input, {}), input);
    assert.deepEqual(applyBrand(input, undefined), input);
});

test('readableOn picks white on a dark colour and black on a pale one', () => {
    assert.equal(readableOn('#0F4C81'), '#FFFFFF');
    assert.equal(readableOn('#F4A261'), '#000000');
    assert.equal(readableOn('#FFFFFF'), '#000000');
    assert.equal(readableOn('#000000'), '#FFFFFF');
});

test('the button label stays readable whatever the brand colour is', () => {
    // A pale yellow button with white text is the failure this prevents. Dawn
    // lets a merchant set any colour, and a client will pick a pale one.
    for (const colour of ['#0F4C81', '#F4A261', '#FFEE00', '#121212', '#FFFFFF']) {
        const scheme = schemeFor('surface', { primaryColor: colour });
        assert.notEqual(
            scheme.button_label,
            scheme.button,
            `label and button are the same colour for ${colour}`,
        );
    }
});

test('a missing preset name falls back to no change rather than throwing', () => {
    const input = { current: 'Missing', presets: { Dawn: { color_schemes: {} } } };
    assert.deepEqual(applyBrand(input, brand), input);
});

test('a settings file that is a string current is handled', () => {
    const input = dawnSettings();
    input.current = 'Dawn';
    assert.ok(applyBrand(input, brand).presets.Dawn.color_schemes['scheme-1'].settings.button);
});

test('lowercase hex from a client is normalised', () => {
    const out = applyBrand(dawnSettings(), { primaryColor: '#0f4c81' });
    assert.equal(out.presets.Dawn.color_schemes['scheme-1'].settings.button, '#0F4C81');
});
