// Applies a client's brand to the Dawn theme settings.
//
// theme-settings.json was written by build-store and read by nothing, so every
// store shipped as stock Dawn: default black buttons and Dawn's own blue, with
// the client's colours sitting unused in a file next to it.
//
// Dawn keeps its colours in settings_data.json under presets.<name>, and
// `current` names the preset in use. Patching the preset that `current` points
// at is what the theme editor itself does.

// Dawn's five schemes have fixed jobs, so the brand maps onto roles rather than
// replacing every colour. Overwriting all five with one colour would flatten the
// contrast Dawn relies on to separate sections.
const SCHEME_ROLES = {
    'scheme-1': 'surface',      // page background, body copy
    'scheme-2': 'muted',        // alternating sections, cards
    'scheme-3': 'inverse',      // dark sections
    'scheme-4': 'strong',       // strongest contrast, footer
    'scheme-5': 'accent',       // call-to-action sections
};

function parseHex(hex) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex({ r, g, b }) {
    const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
    return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

// WCAG relative luminance. Used to pick a label colour that stays readable on a
// button: a client's brand colour can be any lightness, and white text on a pale
// yellow button is unreadable.
function luminance({ r, g, b }) {
    const channel = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

// The readable of black/white on a given background.
export function readableOn(background) {
    const bg = parseHex(background);
    if (!bg) return '#000000';
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };
    return contrastRatio(bg, white) >= contrastRatio(bg, black) ? '#FFFFFF' : '#000000';
}

function mix(a, b, ratio) {
    const ca = parseHex(a);
    const cb = parseHex(b);
    if (!ca || !cb) return a;
    return toHex({
        r: ca.r + (cb.r - ca.r) * ratio,
        g: ca.g + (cb.g - ca.g) * ratio,
        b: ca.b + (cb.b - ca.b) * ratio,
    });
}

export function schemeFor(role, brand) {
    // Normalised once. A client config may write #0f4c81 or #0F4C81, and both
    // must reach the theme in the same form or two builds of one store differ.
    const primary = parseHex(brand.primaryColor) ? toHex(parseHex(brand.primaryColor)) : '#121212';
    const secondary = parseHex(brand.secondaryColor) ? toHex(parseHex(brand.secondaryColor)) : primary;
    const onPrimary = readableOn(primary);

    switch (role) {
        case 'surface':
            return {
                background: '#FFFFFF',
                background_gradient: '',
                text: '#121212',
                button: primary,
                button_label: onPrimary,
                secondary_button_label: primary,
                shadow: mix(primary, '#000000', 0.75),
            };
        case 'muted':
            return {
                background: mix(primary, '#FFFFFF', 0.94),
                background_gradient: '',
                text: '#121212',
                button: primary,
                button_label: onPrimary,
                secondary_button_label: primary,
                shadow: mix(primary, '#000000', 0.75),
            };
        case 'inverse':
            return {
                background: mix(primary, '#000000', 0.6),
                background_gradient: '',
                text: '#FFFFFF',
                button: '#FFFFFF',
                button_label: mix(primary, '#000000', 0.6),
                secondary_button_label: '#FFFFFF',
                shadow: '#121212',
            };
        case 'strong':
            return {
                background: '#121212',
                background_gradient: '',
                text: '#FFFFFF',
                button: secondary,
                button_label: readableOn(secondary),
                secondary_button_label: '#FFFFFF',
                shadow: '#121212',
            };
        case 'accent':
            return {
                background: primary,
                background_gradient: '',
                text: onPrimary,
                button: onPrimary,
                button_label: primary,
                secondary_button_label: onPrimary,
                shadow: '#121212',
            };
        default:
            return null;
    }
}

// Returns a new settings_data object. Input is not mutated.
export function applyBrand(settingsData, brand) {
    if (!brand?.primaryColor) return settingsData;
    const presetName = typeof settingsData.current === 'string'
        ? settingsData.current
        : 'Dawn';
    const preset = settingsData.presets?.[presetName];
    if (!preset) return settingsData;

    const colorSchemes = { ...(preset.color_schemes || {}) };
    for (const [id, scheme] of Object.entries(colorSchemes)) {
        const role = SCHEME_ROLES[id];
        const next = role ? schemeFor(role, brand) : null;
        if (next) colorSchemes[id] = { ...scheme, settings: { ...scheme.settings, ...next } };
    }

    return {
        ...settingsData,
        presets: {
            ...settingsData.presets,
            [presetName]: { ...preset, color_schemes: colorSchemes },
        },
    };
}
