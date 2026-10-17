// Prepares a branded copy of the master theme for one client.
//
// The push used to send theme/ directly, which is a pristine Dawn subtree, so
// every store came out with Dawn's default black and blue and the client's
// colours were left unused in theme-settings.json. Branding is applied to a
// copy under dist/<slug>/theme so theme/ stays a clean upstream subtree that can
// be updated with `git subtree pull`.
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyBrand } from './theme-brand.mjs';

export function prepareTheme(config, { root, outDir }) {
    const source = resolve(root, 'theme');
    const target = resolve(outDir, 'theme');
    if (!existsSync(source)) {
        throw new Error('theme/ is missing; add the Dawn subtree first');
    }

    mkdirSync(target, { recursive: true });
    cpSync(source, target, { recursive: true });

    const settingsPath = resolve(target, 'config/settings_data.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    const branded = applyBrand(settings, config.brand);
    writeFileSync(settingsPath, `${JSON.stringify(branded, null, 2)}\n`, 'utf8');

    const storeName = config.client?.displayName || config.client?.slug || '';
    return { themeDir: target, storeName };
}
