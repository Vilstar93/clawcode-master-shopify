import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareTheme } from './theme-prepare.mjs';

function fakeRepo() {
    const root = mkdtempSync(join(tmpdir(), 'theme-prep-'));
    mkdirSync(join(root, 'theme/config'), { recursive: true });
    writeFileSync(join(root, 'theme/config/settings_data.json'), JSON.stringify({
        current: 'Dawn',
        presets: { Dawn: { logo_width: 90, color_schemes: { 'scheme-1': { settings: { button: '#121212' } } } } },
    }));
    writeFileSync(join(root, 'theme/config/settings_schema.json'), '{}');
    return root;
}

test('the pushed theme is branded and the source is untouched', () => {
    // theme/ is an upstream Dawn subtree. Branding it in place would make the
    // next `git subtree pull` conflict on a file we changed.
    const root = fakeRepo();
    const outDir = join(root, 'dist', 'acme');
    const config = { client: { slug: 'acme', displayName: 'Acme' }, brand: { primaryColor: '#0F4C81' } };

    const { themeDir } = prepareTheme(config, { root, outDir });

    const pushed = JSON.parse(readFileSync(join(themeDir, 'config/settings_data.json'), 'utf8'));
    assert.equal(pushed.presets.Dawn.color_schemes['scheme-1'].settings.button, '#0F4C81');

    const source = JSON.parse(readFileSync(join(root, 'theme/config/settings_data.json'), 'utf8'));
    assert.equal(source.presets.Dawn.color_schemes['scheme-1'].settings.button, '#121212');
    rmSync(root, { recursive: true, force: true });
});

test('a missing theme directory fails with an instruction', () => {
    const root = mkdtempSync(join(tmpdir(), 'theme-prep-'));
    assert.throws(
        () => prepareTheme({ client: { slug: 'acme' } }, { root, outDir: join(root, 'dist/acme') }),
        /subtree/,
    );
    rmSync(root, { recursive: true, force: true });
});

test('the branded theme is a full copy, not just the config', () => {
    // The push uploads this directory. A copy that dropped sections or assets
    // would deploy a theme that renders as an empty page.
    const root = fakeRepo();
    const outDir = join(root, 'dist', 'acme');
    const { themeDir } = prepareTheme(
        { client: { slug: 'acme' }, brand: { primaryColor: '#0F4C81' } },
        { root, outDir },
    );
    assert.ok(existsSync(join(themeDir, 'config/settings_schema.json')));
    assert.ok(existsSync(join(themeDir, 'config/settings_data.json')));
    rmSync(root, { recursive: true, force: true });
});
