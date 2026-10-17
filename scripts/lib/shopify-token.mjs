// Obtains an Admin API access token for a Dev Dashboard app.
//
// Shopify stopped showing a copyable admin token on 1 January 2026. Apps are
// created in the Dev Dashboard instead, and you hold a Client ID and Client
// secret rather than a token. The token is requested programmatically and lasts
// 24 hours, so it cannot be pasted into .env and forgotten: it has to be minted
// on each run.
//
// The client credentials grant only reaches stores in the same Shopify
// organization as the app. A client's store is not, so for those you use the
// authorization code grant and store the resulting non-expiring token. This
// module handles both, preferring a stored token when one is present because
// that is the only path that works for a client store.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = resolve(ROOT, '.shopify-token-cache.json');

// Shopify reports expires_in as 86399 (24 hours). Refresh early: a token that
// expires mid-import fails partway through a batch, which is worse than one
// extra request.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

function readCache(path) {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
        return {};
    }
}

function writeCache(path, cache) {
    try {
        writeFileSync(path, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
    } catch {
        // A read-only checkout is not a reason to fail the import.
    }
}

// A token that is already valid is returned as-is. This is the path for a
// client store: its token comes from the authorization code grant and does not
// expire, and no client credentials request can produce it.
export function storedToken(env = process.env) {
    return env.SHOPIFY_ADMIN_TOKEN || '';
}

export function hasClientCredentials(env = process.env) {
    return Boolean(env.SHOPIFY_CLIENT_ID && env.SHOPIFY_CLIENT_SECRET);
}

export async function getAccessToken({ domain, env = process.env, fetchImpl = fetch, cachePath = CACHE }) {
    const stored = storedToken(env);
    if (stored) return stored;

    if (!hasClientCredentials(env)) {
        throw new Error(
            'No Shopify credentials. Set SHOPIFY_ADMIN_TOKEN, or SHOPIFY_CLIENT_ID and ' +
            'SHOPIFY_CLIENT_SECRET for a Dev Dashboard app in your own organization.'
        );
    }

    const shop = domain.replace(/^https?:\/\//, '').replace(/\.myshopify\.com.*$/, '');

    const cache = readCache(cachePath);
    const entry = cache[shop];
    if (entry?.token && Date.now() < entry.expiresAt - REFRESH_MARGIN_MS) {
        return entry.token;
    }

    const res = await fetchImpl(`https://${shop}.myshopify.com/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: env.SHOPIFY_CLIENT_ID,
            client_secret: env.SHOPIFY_CLIENT_SECRET,
        }).toString(),
    });

    const text = await res.text();
    let body;
    try {
        body = JSON.parse(text);
    } catch {
        throw new Error(`Token endpoint returned ${res.status} and no JSON.`);
    }

    if (!res.ok || !body.access_token) {
        // shop_not_permitted is the common one and the message is opaque. It
        // means the store is not in the app's organization, which is exactly
        // the case for a client store.
        if (body.error === 'shop_not_permitted') {
            throw new Error(
                `Client credentials cannot be used for ${domain}: the store is not in this ` +
                'app\'s Shopify organization. Install the app on the store with custom ' +
                'distribution and use the authorization code grant, then set SHOPIFY_ADMIN_TOKEN.'
            );
        }
        throw new Error(`Token request failed (HTTP ${res.status}): ${text.slice(0, 200)}`);
    }

    const expiresAt = Date.now() + (body.expires_in ?? 86399) * 1000;
    writeCache(cachePath, { ...cache, [shop]: { token: body.access_token, expiresAt } });
    return body.access_token;
}
