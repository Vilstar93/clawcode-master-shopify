// Gets a non-expiring Admin API token through the authorization code grant.
//
// The client credentials grant only works when the app and the store are in the
// same Shopify organization. A real store, and any client's store, is not: the
// token endpoint answers application_cannot_be_found, because the store's OAuth
// service cannot see an app from another organization. The authorization code
// grant works for any store where the app is installed and someone can approve
// it, and it returns a token that does not expire.
//
// The redirect lands on whatever URL the app has registered, so this does not
// need a local server: the browser ends up with the code in its address bar and
// the operator pastes it back.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { loadEnv, envPath } from './lib/env.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const SCOPES = 'write_products';

export function authorizeUrl({ shop, clientId, redirectUri, state, scopes = SCOPES }) {
    const params = new URLSearchParams({
        client_id: clientId,
        scope: scopes,
        redirect_uri: redirectUri,
        state,
    });
    return `https://${shop}/admin/oauth/authorize?${params}`;
}

// Shopify signs the query string it redirects with. Without this check any page
// could hand us a code of its choosing, so the token we store could belong to an
// app the operator never approved.
export function verifyHmac(query, secret) {
    const params = new URLSearchParams(query);
    const hmac = params.get('hmac');
    if (!hmac) return false;
    params.delete('hmac');
    params.delete('signature');
    const message = [...params.entries()]
        .map(([k, v]) => `${k}=${v}`)
        .sort()
        .join('&');
    const expected = createHmac('sha256', secret).update(message).digest('hex');
    const a = Buffer.from(hmac, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
}

export async function exchangeCode({ shop, clientId, clientSecret, code, fetchImpl = fetch }) {
    const res = await fetchImpl(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
        }).toString(),
    });
    const text = await res.text();
    let body;
    try {
        body = JSON.parse(text);
    } catch {
        throw new Error(`Token exchange returned ${res.status} and no JSON: ${text.slice(0, 160)}`);
    }
    if (!res.ok || !body.access_token) {
        throw new Error(`Token exchange failed (HTTP ${res.status}): ${text.slice(0, 200)}`);
    }
    return body.access_token;
}

// Extracts the code whether the operator pasted the whole redirect URL or only
// the code itself, because which one they have depends on where they copied it.
export function extractCode(input) {
    const value = String(input || '').trim();
    if (!value) return '';
    if (!value.includes('code=') && !value.includes('?')) return value;
    const query = value.slice(value.indexOf('?') + 1);
    return new URLSearchParams(query).get('code') || '';
}

function upsertEnv(key, value) {
    // Resolved per call: SHOPIFY_ENV_FILE may be set by the caller, and a test
    // must be able to write a throwaway file instead of the operator's .env.
    const target = envPath();
    const lines = existsSync(target) ? readFileSync(target, 'utf8').split('\n') : [];
    const out = [];
    let seen = false;
    for (const line of lines) {
        if (new RegExp(`^\\s*${key}\\s*=`).test(line)) {
            out.push(`${key}=${value}`);
            seen = true;
        } else {
            out.push(line);
        }
    }
    if (!seen) out.push(`${key}=${value}`);
    writeFileSync(target, `${out.join('\n').replace(/\n+$/, '')}\n`, 'utf8');
}

async function main() {
    loadEnv();
    const shop = (process.env.SHOPIFY_STORE_DOMAIN || '')
        .replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    const redirectUri = process.env.SHOPIFY_REDIRECT_URI || 'https://example.com/auth/callback';

    if (!shop || !clientId || !clientSecret) {
        console.error('✗ Set SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in .env');
        process.exit(1);
    }

    const state = randomBytes(16).toString('hex');
    console.log('1. Open this URL, approve the app, then copy the address bar of the page you land on.');
    console.log('   It will show an error page. That is expected: the code is in its URL.\n');
    console.log(`   ${authorizeUrl({ shop, clientId, redirectUri, state })}\n`);

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('2. Paste the full URL (or just the code): ');
    rl.close();

    const raw = answer.trim();
    if (raw.includes('hmac=') && !verifyHmac(raw.slice(raw.indexOf('?') + 1), clientSecret)) {
        console.error('✗ The redirect failed its signature check. Do not trust this code.');
        process.exit(1);
    }
    const code = extractCode(raw);
    if (!code) {
        console.error('✗ No authorization code found in that input.');
        process.exit(1);
    }

    let token;
    try {
        token = await exchangeCode({ shop, clientId, clientSecret, code });
    } catch (error) {
        console.error(`✗ ${error.message}`);
        process.exit(1);
    }

    // Prove the token before storing it: a token that cannot read the shop name
    // is not worth writing into .env and debugging later.
    const check = await fetch(`https://${shop}/admin/api/${process.env.SHOPIFY_API_VERSION || '2026-01'}/graphql.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
        body: JSON.stringify({ query: '{ shop { name myshopifyDomain } }' }),
    });
    const body = await check.json();
    if (body.errors || !body.data?.shop) {
        console.error(`✗ Token rejected: ${JSON.stringify(body.errors || body).slice(0, 200)}`);
        process.exit(1);
    }

    upsertEnv('SHOPIFY_ADMIN_TOKEN', token);
    console.log(`✓ Connected to "${body.data.shop.name}" (${body.data.shop.myshopifyDomain}).`);
    console.log('✓ Wrote SHOPIFY_ADMIN_TOKEN to .env. It does not expire.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error(`✗ ${error.message}`);
        process.exit(1);
    });
}
