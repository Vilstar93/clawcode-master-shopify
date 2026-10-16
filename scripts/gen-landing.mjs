#!/usr/bin/env node
// Renders the landing template into dist/<slug>/landing/.
// Output: static files + one serverless function. No secrets involved.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync, cpSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAndValidate } from './validate-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tplDir = resolve(root, 'templates', 'landing');

function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function render(tpl, vars) {
    return tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

function assetPath(p, slug) {
    // Config paths look like "clients/<slug>/products/1-1.jpg".
    // The landing bundle copies that folder to ./assets, so rewrite the prefix.
    const prefix = `clients/${slug}/`;
    const rel = String(p || '').replace(/^\/+/, '');
    return '/' + (rel.startsWith(prefix) ? 'assets/' + rel.slice(prefix.length) : rel);
}

function buildVars(config) {
    const c = config.client;
    const b = config.brand || {};
    const addr = c.address || {};
    const locale = c.locale || 'bg-BG';
    const lang = locale.split('-')[0];
    const bg = lang === 'bg';
    const slug = c.slug;

    const T = bg
        ? {
              eyebrow: 'Онлайн магазин',
              headline: `${b.tagline || c.displayName}`,
              subheadline: `Поръчайте директно онлайн. Плащане с карта или наложен платеж. Доставка с ${(config.shipping?.carriers || ['куриер']).join(' или ')}.`,
              ctaPrimary: 'Разгледай продуктите',
              ctaSecondary: 'Как да поръчам',
              productsTitle: 'Продукти',
              productsSub: 'Изберете продукт и завършете поръчката в защитения Shopify checkout.',
              howTitle: 'Как да поръчам',
              howSub: 'Три стъпки, без регистрация.',
              howStep1Title: '1. Избирате',
              howStep1Text: 'Натискате „Купи сега“ на избрания продукт.',
              howStep2Title: '2. Плащате',
              howStep2Text: 'Попълвате адрес и плащате в защитения checkout.',
              howStep3Title: '3. Получавате',
              howStep3Text: 'Доставяме с куриер за 1–2 работни дни.',
              faqTitle: 'Въпроси',
              faqSub: 'Най-често задаваните.',
              navProducts: 'Продукти',
              navHow: 'Как да поръчам',
              navFaq: 'Въпроси',
              navContact: 'Контакти',
              legalTitle: 'Документи',
              lTerms: 'Общи условия',
              lPrivacy: 'Политика за поверителност',
              lWithdrawal: 'Право на отказ',
              lShipping: 'Доставка и плащане',
              legalRights: 'Всички права запазени.',
              buyLoading: 'Моля изчакайте…',
              buyError: 'Поръчката не можа да започне. Опитайте отново.',
              buyNow: 'Купи сега',
              msgMethodNotAllowed: 'Методът не е разрешен.',
              msgUnknownProduct: 'Неизвестен продукт.',
              msgNoVariant: 'Продуктът не е свързан с Shopify.',
              msgCheckoutFailed: 'Checkout-ът не можа да започне. Опитайте отново.'
          }
        : {
              eyebrow: 'Online shop',
              headline: `${b.tagline || c.displayName}`,
              subheadline: `Order online. Card or cash on delivery. Shipped with ${(config.shipping?.carriers || ['courier']).join(' or ')}.`,
              ctaPrimary: 'See products',
              ctaSecondary: 'How to order',
              productsTitle: 'Products',
              productsSub: 'Pick a product and finish in Shopify secure checkout.',
              howTitle: 'How to order',
              howSub: 'Three steps, no account needed.',
              howStep1Title: '1. Choose',
              howStep1Text: 'Click "Buy now" on the product you want.',
              howStep2Title: '2. Pay',
              howStep2Text: 'Enter your address and pay in the secure checkout.',
              howStep3Title: '3. Receive',
              howStep3Text: 'We ship within 1-2 business days.',
              faqTitle: 'Questions',
              faqSub: 'Frequently asked.',
              navProducts: 'Products',
              navHow: 'How to order',
              navFaq: 'FAQ',
              navContact: 'Contact',
              legalTitle: 'Documents',
              lTerms: 'Terms',
              lPrivacy: 'Privacy policy',
              lWithdrawal: 'Right of withdrawal',
              lShipping: 'Shipping and payment',
              legalRights: 'All rights reserved.',
              buyLoading: 'Please wait…',
              buyError: 'Could not start the order. Please try again.',
              buyNow: 'Buy now',
              msgMethodNotAllowed: 'Method not allowed.',
              msgUnknownProduct: 'Unknown product.',
              msgNoVariant: 'Product is not linked to Shopify.',
              msgCheckoutFailed: 'Checkout could not start. Please try again.'
          };

    const uspItems = (config.store?.usps || []).slice(0, 3)
        .map((u) => `<div><strong>${esc(u.split(':')[0])}</strong><span>${esc(u.split(':').slice(1).join(':').trim() || '')}</span></div>`)
        .join('\n    ');

    const productCards = config.products
        .map((p) => {
            const img = p.images?.[0] ? `<img src="${assetPath(p.images[0], slug)}" alt="${esc(p.title)}" loading="lazy">` : '';
            const was = p.compareAtPrice && p.compareAtPrice > p.price
                ? `<span class="was">${p.compareAtPrice.toFixed(2)} ${c.currency}</span>` : '';
            return `<article class="card">
        ${img}
        <div class="card-body">
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.shortDescription || '')}</p>
          <div class="price"><span class="now">${p.price.toFixed(2)} ${c.currency}</span>${was}</div>
          <button class="btn btn-primary" data-buy="${esc(p.handle)}">${T.buyNow}</button>
        </div>
      </article>`;
        })
        .join('\n      ');

    const faq = bg
        ? [
              ['Как да платя?', 'С карта през Shopify или с наложен платеж при доставка.'],
              ['Колко е доставката?', config.shipping?.freeOver
                  ? `Безплатна при поръчка над ${config.shipping.freeOver} ${c.currency}, иначе според тарифата на куриера.`
                  : 'Според тарифата на куриера.'],
              ['Мога ли да върна продукт?', `Да, в срок от ${config.legal?.returnDays || 14} дни.`],
              ['Издавате ли фактура?', 'Да, фактура се издава с всяка поръчка.']
          ]
        : [
              ['How do I pay?', 'By card through Shopify, or cash on delivery.'],
              ['What is shipping?', config.shipping?.freeOver
                  ? `Free over ${config.shipping.freeOver} ${c.currency}, otherwise per carrier rates.`
                  : 'Per carrier rates.'],
              ['Can I return it?', `Yes, within ${config.legal?.returnDays || 14} days.`],
              ['Do you issue an invoice?', 'Yes, every order gets an invoice.']
          ];

    const faqItems = faq
        .map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`)
        .join('\n    ');

    const addressBlock = [addr.street, [addr.postalCode, addr.city].filter(Boolean).join(' '), addr.country]
        .filter(Boolean).join('<br>');

    return {
        slug: c.slug,
        brandName: esc(c.displayName),
        legalName: esc(c.legalName || c.displayName),
        eik: esc(c.eik || ''),
        vatId: esc(c.vatId || ''),
        email: esc(c.email || ''),
        phone: esc(c.phone || ''),
        phoneRaw: String(c.phone || '').replace(/[^\d+]/g, ''),
        addressBlock,
        lang,
        storeDomain: esc(config.store?.domain || ''),
        primaryColor: esc(b.primaryColor || '#1f6feb'),
        secondaryColor: esc(b.secondaryColor || '#0f172a'),
        tagline: esc(b.tagline || ''),
        metaDescription: esc(b.metaDescription || b.tagline || c.displayName),
        heroImg: config.store?.heroImage
            ? `<img src="${assetPath(config.store.heroImage, slug)}" alt="${esc(c.displayName)}">`
            : `<img src="/assets/hero.jpg" alt="${esc(c.displayName)}">`,
        logoImg: b.logo
            ? `<img src="${assetPath(b.logo, slug)}" alt="${esc(c.displayName)}">`
            : '',
        uspItems,
        productCards,
        faqItems,
        ...T
    };
}

function walk(dir, base = dir, out = []) {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full, base, out);
        else out.push(relative(base, full));
    }
    return out;
}

export function generateLanding(config) {
    const outDir = resolve(root, 'dist', config.client.slug, 'landing');
    mkdirSync(outDir, { recursive: true });
    const vars = buildVars(config);
    const written = [];

    // Copy client assets so the deployed bundle is self-contained.
    const assetsSrc = resolve(root, 'clients', config.client.slug);
    if (existsSync(assetsSrc)) {
        cpSync(assetsSrc, resolve(outDir, 'assets'), { recursive: true });
        written.push('assets/');
    }

    for (const rel of walk(tplDir)) {
        const src = readFileSync(join(tplDir, rel), 'utf8');
        const outRel = rel.replace(/\.tpl$/, '');
        const outPath = resolve(outDir, outRel);
        mkdirSync(dirname(outPath), { recursive: true });

        if (outRel === 'api/_products.js') {
            const list = config.products
                .filter((p) => p.variantId)
                .map((p) => `    { slug: ${JSON.stringify(p.handle)}, title: ${JSON.stringify(p.title)}, price: ${p.price}, variantId: ${JSON.stringify(p.variantId)} }`)
                .join(',\n');
            writeFileSync(outPath, render(src, { ...vars, products: list }));
        } else {
            writeFileSync(outPath, render(src, vars));
        }
        written.push(outRel);
    }

    return { outDir, written };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const arg = process.argv[2];
    if (!arg) {
        console.error('Usage: node scripts/gen-landing.mjs <config.json>');
        process.exit(2);
    }
    const { config, errors } = loadAndValidate(resolve(process.cwd(), arg));
    if (errors.length) {
        console.error('✗ config invalid; run validate first');
        process.exit(1);
    }
    const missing = config.products.filter((p) => !p.variantId).map((p) => p.handle);
    if (missing.length) {
        console.warn(`⚠ ${missing.length} product(s) have no variantId and will be omitted from the landing checkout: ${missing.join(', ')}`);
        console.warn('  Add variantId after importing to Shopify, then re-run.');
    }
    const { outDir, written } = generateLanding(config);
    console.log(`✓ landing generated (${written.length} file(s)) -> ${outDir}`);
    written.forEach((w) => console.log('  + ' + w));
}
