#!/usr/bin/env node
// Generates dist/<slug>/HANDOFF.md from the config and the QA results.
// The agent fills the judgement sections; the script fills the factual ones.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAndValidate } from './validate-config.mjs';
import { qa } from './qa-check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tplPath = resolve(root, 'templates', 'handoff', 'HANDOFF.md.tpl');

function render(tpl, vars) {
    return tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

const mark = (ok) => (ok ? '✅ done' : '⚠️ pending');

export function generateHandoff(config, { preparedFor = 'the client', notes = '', gaps = [] } = {}) {
    const slug = config.client.slug;
    const distDir = resolve(root, 'dist', slug);
    mkdirSync(distDir, { recursive: true });

    const checks = qa(config, distDir);
    const failed = checks.filter((c) => !c.ok);
    const hasTheme = existsSync(resolve(root, 'theme/layout'));
    const legalCount = (config.legal?.pages || ['obshti-usloviya', 'poveritelnost', 'pravo-na-otkaz', 'danni-za-firmata', 'dostavka-i-plashtane']).length;

    const built = [];
    built.push(`- Product import file: \`dist/${slug}/products.csv\` (${config.products.length} product(s))`);
    built.push(`- Legal pages: ${legalCount} page(s) in \`dist/${slug}/legal/\`, all stamped DRAFT`);
    built.push(`- Theme settings payload: \`dist/${slug}/theme-settings.json\``);
    built.push(`- Build manifest: \`dist/${slug}/manifest.json\``);
    if (existsSync(resolve(distDir, 'landing'))) built.push(`- Landing package: \`dist/${slug}/landing/\``);
    if (existsSync(resolve(distDir, 'assets'))) built.push(`- Client assets copied to \`dist/${slug}/assets/\``);

    const manual = [];
    manual.push('- [ ] Review the legal pages and remove the DRAFT stamp after approval');
    manual.push('- [ ] Enable the payment provider in the Shopify admin');
    manual.push('- [ ] Configure shipping rates and carriers');
    manual.push('- [ ] Confirm tax settings with the accountant');
    manual.push(`- [ ] Buy or connect the domain in Shopify (${config.store?.domain || 'not set'})`);
    manual.push('- [ ] Verify the email sender domain for notifications');
    manual.push('- [ ] Publish the theme after review');
    manual.push('- [ ] Run one test order end to end');

    const qaTable = checks
        .map((c) => `| ${c.name} | ${c.ok ? 'pass' : 'FAIL'}${c.detail ? ` — ${c.detail}` : ''} |`)
        .join('\n');

    const legalList = (config.legal?.pages || ['obshti-usloviya', 'poveritelnost', 'pravo-na-otkaz', 'danni-za-firmata', 'dostavka-i-plashtane'])
        .map((p) => `- [ ] \`${p}\``)
        .join('\n');

    const gapsList = gaps.length
        ? gaps.map((g) => `- ${g}`).join('\n')
        : failed.length
            ? failed.map((f) => `- ${f.name}${f.detail ? ` (${f.detail})` : ''}`).join('\n')
            : '- None recorded.';

    const vars = {
        displayName: config.client.displayName,
        legalName: config.client.legalName || config.client.displayName,
        slug,
        storeDomain: config.store?.domain || 'not set',
        generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
        preparedFor,

        statusConfig: '✅ done',
        statusProducts: config.products.length ? '✅ done' : '⚠️ pending',
        statusTheme: mark(hasTheme),
        statusLegal: '⚠️ drafts — review required',
        statusDomain: '⚠️ human action required',
        statusPayments: '⚠️ human action required',
        statusShipping: '⚠️ human action required',
        statusTaxes: '⚠️ human action required',
        statusAnalytics: config.integrations?.ga4 ? '✅ done' : '⚠️ pending',
        statusQa: failed.length ? `⚠️ ${failed.length} blocker(s)` : '✅ all passed',
        overallStatus: failed.length
            ? '**Not ready.** Resolve the blockers in section 4, then complete the manual steps.'
            : '**Ready for the manual steps.** All automated checks passed.',

        themeNote: hasTheme ? 'Dawn subtree present' : 'run: git subtree add --prefix=theme ...',
        domainNote: config.store?.domain || 'not set',
        legalCount,
        productCount: config.products.length,
        collectionCount: (config.collections || []).length,
        analyticsNote: config.integrations?.ga4 || 'GA4 not set',
        qaSummary: `${checks.length - failed.length}/${checks.length} passed`,

        builtList: built.join('\n'),
        artifactList: `dist/${slug}/\n├── products.csv\n├── theme-settings.json\n├── manifest.json\n├── HANDOFF.md\n├── legal/\n${existsSync(resolve(distDir, 'landing')) ? '├── landing/\n' : ''}${existsSync(resolve(distDir, 'assets')) ? '└── assets/\n' : ''}`,

        manualChecklist: manual.join('\n'),
        paymentMethods: (config.payments?.methods || []).join(', ') || 'not set',
        shippingCarriers: (config.shipping?.carriers || []).join(', ') || 'not set',
        freeShipping: config.shipping?.freeOver ? `${config.shipping.freeOver} ${config.client.currency}` : 'not set',

        domainSteps: [
            '1. Shopify admin → Settings → Domains.',
            `2. Buy \`${config.store?.domain || '<domain>'}\` or connect the client's existing domain.`,
            '3. Set it as the primary domain and let Shopify issue TLS.',
            '4. No third-party DNS or proxy. See `docs/07-domain-and-hosting.md`.'
        ].join('\n'),

        legalList,
        knownGaps: gapsList,
        qaTable,

        email: config.client.email || 'not set',
        phone: config.client.phone || 'not set',
        shopifyPlan: config.store?.plan || 'not set',
        notesForNext: notes || '- None.'
    };

    const out = render(readFileSync(tplPath, 'utf8'), vars);
    const outPath = resolve(distDir, 'HANDOFF.md');
    writeFileSync(outPath, out);
    return { outPath, failed: failed.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const arg = process.argv[2];
    if (!arg) {
        console.error('Usage: node scripts/gen-handoff.mjs <config.json> [--for "Name"] [--notes "..."]');
        process.exit(2);
    }
    const idx = process.argv.indexOf('--for');
    const nidx = process.argv.indexOf('--notes');
    const { config, errors } = loadAndValidate(resolve(process.cwd(), arg));
    if (errors.length) {
        console.error('✗ config invalid; run validate first');
        process.exit(1);
    }
    const { outPath, failed } = generateHandoff(config, {
        preparedFor: idx > -1 ? process.argv[idx + 1] : 'the client',
        notes: nidx > -1 ? process.argv[nidx + 1] : ''
    });
    console.log(`✓ handoff written -> ${outPath}`);
    if (failed) console.log(`  ⚠ ${failed} QA blocker(s) listed in section 4`);
}
