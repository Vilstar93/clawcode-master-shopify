#!/usr/bin/env node
// Renders legal page templates into HTML using client config values.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAndValidate } from './validate-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function placeholderMap(config) {
    const c = config.client;
    const a = c.address || {};
    const addressLines = [a.street, [a.postalCode, a.city].filter(Boolean).join(' '), a.country]
        .filter(Boolean)
        .join('\n');
    return {
        displayName: c.displayName,
        legalName: c.legalName,
        address: addressLines,
        email: c.email,
        phone: c.phone || '',
        eik: c.eik || '',
        vatId: c.vatId || '',
        returnDays: String(config.legal?.returnDays ?? 14),
        jurisdiction: config.legal?.jurisdiction || 'BG',
        storeDomain: config.store?.domain || '',
        carriers: (config.shipping?.carriers || []).join(', '),
        freeOver: config.shipping?.freeOver != null ? String(config.shipping.freeOver) : '',
        currency: c.currency || 'EUR'
    };
}

function render(template, values) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
        values[key] !== undefined ? values[key] : `{{${key}}}`
    );
}

export function generateLegal(config, outDir) {
    const tplDir = resolve(root, 'templates/legal-bg');
    if (!existsSync(tplDir)) throw new Error(`Missing templates: ${tplDir}`);
    const values = placeholderMap(config);
    mkdirSync(outDir, { recursive: true });
    const written = [];

    for (const file of readdirSync(tplDir).filter((f) => f.endsWith('.md'))) {
        const name = basename(file, '.md');
        const body = render(readFileSync(join(tplDir, file), 'utf8'), values);
        const html = `<!doctype html>
<html lang="${config.client.locale.split('-')[0]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name} — ${values.displayName}</title>
<style>body{font-family:system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#1a1a1a}
.draft{background:#fff3cd;border:1px solid #ffe69c;padding:.75rem 1rem;border-radius:.5rem;margin-bottom:2rem;font-weight:600}
h1,h2{line-height:1.25}</style>
</head>
<body>
<div class="draft">ЧЕРНОВА — изисква правен преглед преди публикуване.</div>
${toHtml(body)}
</body>
</html>`;
        const outPath = join(outDir, `${name}.html`);
        writeFileSync(outPath, html);
        written.push(outPath);
    }
    return written;
}

// Tiny markdown -> HTML for headings, lists, paragraphs, bold.
function toHtml(md) {
    const lines = md.split('\n');
    const out = [];
    let inList = false;
    for (const line of lines) {
        const t = line.trim();
        if (t.startsWith('- ')) {
            if (!inList) { out.push('<ul>'); inList = true; }
            out.push(`<li>${inline(t.slice(2))}</li>`);
            continue;
        }
        if (inList) { out.push('</ul>'); inList = false; }
        if (!t) continue;
        const h = t.match(/^(#{1,3})\s+(.*)$/);
        if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
        out.push(`<p>${inline(t)}</p>`);
    }
    if (inList) out.push('</ul>');
    return out.join('\n');
}

function inline(s) {
    return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const arg = process.argv[2];
    if (!arg) {
        console.error('Usage: node scripts/gen-legal.mjs <config.json>');
        process.exit(2);
    }
    const configPath = resolve(process.cwd(), arg);
    const { config, errors } = loadAndValidate(configPath);
    if (errors.length) {
        console.error('✗ config invalid; run validate first');
        process.exit(1);
    }
    const outDir = resolve(root, 'dist', config.client.slug, 'legal');
    const files = generateLegal(config, outDir);
    console.log(`✓ generated ${files.length} legal page(s) -> ${outDir}`);
}
