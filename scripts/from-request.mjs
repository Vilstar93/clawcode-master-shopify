#!/usr/bin/env node
// Turn a portal request into a starting client config.
//
// The portal collects nine fields. A client config needs around sixty. Filling
// the gap by hand for every client is slow and produces inconsistent stores, so
// this derives the rest: slug, defaults for Bulgarian firms, and placeholder
// products that the operator replaces.
//
// The output is a starting point, not a finished config. Fields that need human
// judgement (products, brand colours, domain) are emitted with clearly-marked
// placeholders, and the command prints exactly what still needs a real value.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from './lib/slug.mjs';
import { validate } from './lib/validate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const schema = JSON.parse(readFileSync(resolve(root, 'config/client.schema.json'), 'utf8'));

function validateAgainstSchema(config) {
    return validate(config, schema);
}

// Bulgarian defaults. These match what the store factory and the legal
// generator expect for a BG firm selling to consumers.
const DEFAULTS = {
    locale: 'bg-BG',
    country: 'BG',
    currency: 'EUR',
    primaryColor: '#0f4c81',
    secondaryColor: '#f4a261',
    tone: 'приятелски, ясен, без клишета',
    returnDays: 14,
    freeOver: 100,
};

export function configFromRequest(request) {
    const legalName = String(request.legalName ?? '').trim();
    const slug = slugify(legalName || request.domain || 'store');

    // "Примерна Фирма ЕООД" -> "Примерна Фирма": the suffix is not a brand.
    const displayName = legalName.replace(/\s*(ЕООД|ООД|АД|ЕООД|ЕТ|ДЗЗД)\s*$/i, '').trim() || legalName;

    const address = parseAddress(request.address);
    const domain = String(request.domain ?? '').trim() || `${slug}.myshopify.com`;

    return {
        client: {
            slug,
            legalName,
            displayName,
            locale: DEFAULTS.locale,
            country: DEFAULTS.country,
            currency: DEFAULTS.currency,
            email: String(request.email ?? '').trim(),
            phone: String(request.phone ?? '').trim(),
            vatId: String(request.vatId ?? '').trim(),
            eik: String(request.eik ?? '').trim(),
            address,
        },
        brand: {
            // A tagline is copy, not data. Mark it so it cannot ship by accident.
            tagline: 'TODO: смени с мото на клиента',
            primaryColor: DEFAULTS.primaryColor,
            secondaryColor: DEFAULTS.secondaryColor,
            tone: DEFAULTS.tone,
        },
        store: {
            domain,
            type: 'store',
            niche: String(request.niche ?? '').trim(),
            usps: [],
        },
        products: [placeholderProduct(slug, String(request.niche ?? '').trim())],
        collections: [],
        payments: {
            methods: ['card', 'cod', 'bank_transfer'],
            manualInstructions: 'Плащане с наложен платеж при доставка.',
        },
        shipping: {
            carriers: ['econt', 'speedy'],
            freeOver: DEFAULTS.freeOver,
            zones: [{ name: 'България', countries: ['BG'], rate: 5.99 }],
        },
        legal: {
            jurisdiction: DEFAULTS.country,
            returnDays: DEFAULTS.returnDays,
        },
        integrations: {
            ga4: '',
            metaPixel: '',
            tiktokPixel: '',
            merchantCenter: false,
        },
    };
}

// The portal asks for a single free-text address line. The config wants it
// split. Guessing wrong is worse than leaving it blank for the operator, so
// only obvious shapes are parsed.
function parseAddress(value) {
    const text = String(value ?? '').trim();
    if (!text) return { street: '', city: '', postalCode: '', country: DEFAULTS.country };

    // "ул. Примерна 1, София 1000"
    const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
        const cityMatch = /^(.+?)\s+(\d{4})$/.exec(parts[1]);
        return {
            street: parts[0],
            city: cityMatch ? cityMatch[1] : parts[1],
            postalCode: cityMatch ? cityMatch[2] : '',
            country: DEFAULTS.country,
        };
    }
    return { street: text, city: '', postalCode: '', country: DEFAULTS.country };
}

function placeholderProduct(slug, niche) {
    return {
        handle: `${slug}-produkt-1`,
        title: 'TODO: име на продукт',
        price: 0,
        stock: 0,
        category: niche,
        shortDescription: 'TODO: описание в едно изречение',
        description: 'TODO: пълно описание',
        tags: [],
        images: [],
    };
}

// Fields the operator must replace before the store is real. Reported by the
// command so the gap between "generated" and "sellable" is explicit.
export function outstandingWork(config) {
    const todo = [];
    if (config.brand.tagline.startsWith('TODO')) todo.push('brand.tagline');
    for (const [i, p] of config.products.entries()) {
        if (p.title.startsWith('TODO')) todo.push(`products[${i}].title`);
        if (!p.price) todo.push(`products[${i}].price`);
        if (p.shortDescription.startsWith('TODO')) todo.push(`products[${i}].shortDescription`);
        if (p.description.startsWith('TODO')) todo.push(`products[${i}].description`);
        if (!p.images?.length) todo.push(`products[${i}].images`);
    }
    if (!config.store.usps.length) todo.push('store.usps');
    if (!config.collections.length) todo.push('collections');
    if (config.store.domain.endsWith('.myshopify.com')) todo.push('store.domain');
    if (!config.integrations.ga4) todo.push('integrations.ga4');
    return todo;
}

// Portal fields the schema requires but cannot be invented. A request missing
// one of these is malformed, and filling it with a placeholder would produce a
// store with a fake contact address. Report it and let the operator fix the
// source.
export function missingRequestFields(request) {
    const missing = [];
    if (!String(request.legalName ?? '').trim()) missing.push('legalName');
    if (!String(request.eik ?? '').trim()) missing.push('eik');
    if (!String(request.email ?? '').trim()) missing.push('email');
    if (!String(request.niche ?? '').trim()) missing.push('niche');
    return missing;
}

function main() {
    const arg = process.argv[2];
    if (!arg) {
        console.error('Usage: node scripts/from-request.mjs <request.json> [out.json]');
        console.error('  request.json: one line from the portal\'s data/requests.jsonl');
        process.exit(2);
    }

    const inputPath = resolve(process.cwd(), arg);
    if (!existsSync(inputPath)) {
        console.error(`✗ no such file: ${inputPath}`);
        process.exit(1);
    }

    let request;
    try {
        // A requests.jsonl line is one JSON object; a plain .json file is the same.
        request = JSON.parse(readFileSync(inputPath, 'utf8'));
    } catch (error) {
        console.error(`✗ ${inputPath} is not valid JSON: ${error.message}`);
        process.exit(1);
    }

    const config = configFromRequest(request);

    const missing = missingRequestFields(request);
    if (missing.length) {
        console.error(`✗ ${inputPath} is missing required field(s): ${missing.join(', ')}`);
        console.error('  These cannot be invented; fix the request and try again.');
        process.exit(1);
    }

    const outPath = resolve(process.cwd(), process.argv[3] ?? `config/${config.client.slug}.json`);

    if (existsSync(outPath) && !process.env.FORCE) {
        console.error(`✗ ${outPath} already exists. Set FORCE=1 to overwrite.`);
        process.exit(1);
    }

    // Validate before writing: an invalid config that reaches the operator as a
    // file is worse than a clear failure here.
    const schemaErrors = validateAgainstSchema(config);
    if (schemaErrors.length) {
        console.error('✗ generated config failed validation:');
        for (const e of schemaErrors) console.error(`  ${e}`);
        process.exit(1);
    }

    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

    console.log(`✓ wrote ${outPath}`);
    console.log(`  slug:     ${config.client.slug}`);
    console.log(`  client:   ${config.client.displayName}`);
    console.log(`  domain:   ${config.store.domain}`);

    const todo = outstandingWork(config);
    console.log(`\n  ${todo.length} field(s) need a real value before this store is sellable:`);
    for (const field of todo) console.log(`    - ${field}`);
    console.log('\n  Next: fill those in, then');
    console.log(`    node scripts/validate-config.mjs ${outPath}`);
    console.log(`    node scripts/build-store.mjs    ${outPath}`);
}

export default main;

if (import.meta.url === `file://${process.argv[1]}`) main();
