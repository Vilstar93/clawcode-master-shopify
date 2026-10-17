import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAccessToken, storedToken, hasClientCredentials } from './shopify-token.mjs';

// The module builds https://<shop>.myshopify.com/..., so a request cannot be
// pointed at a local server without rewriting the URL. Instead fetchImpl is
// handed the request the module would send and returns a real Response. That
// still exercises the real URL building, body encoding and response handling.
// A mock that only asserts it was called is what let the old token handling
// ship broken.
function fakeFetch(capture, response) {
    return async (url, init) => {
        capture.url = url;
        capture.init = init;
        return new Response(JSON.stringify(response.body), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
        });
    };
}

// The token cache is written to disk. Tests must not touch the repository copy,
// and each one needs its own file: a shared cache lets an earlier test's token
// satisfy a later one, which hides the request that test is asserting on.
let cacheSeq = 0;
const noCache = () => ({ cachePath: `/tmp/shopify-token-test-${process.pid}-${cacheSeq++}.json` });

test('a stored token is used as-is and no request is made', async () => {
    let called = false;
    const token = await getAccessToken({
        domain: 'client-store.myshopify.com',
        env: { SHOPIFY_ADMIN_TOKEN: 'shpat_stored' },
        fetchImpl: async () => { called = true; },
        ...noCache(),
    });
    assert.equal(token, 'shpat_stored');
    assert.equal(called, false, 'a stored token must not trigger a token request');
});

test('client credentials are exchanged for a token', async () => {
    const capture = {};
    const token = await getAccessToken({
        domain: 'my-store.myshopify.com',
        env: { SHOPIFY_CLIENT_ID: 'cid', SHOPIFY_CLIENT_SECRET: 'csec' },
        fetchImpl: fakeFetch(capture, { status: 200, body: { access_token: 'shpca_new', expires_in: 86399 } }),
        ...noCache(),
    });
    assert.equal(token, 'shpca_new');
    assert.equal(capture.url, 'https://my-store.myshopify.com/admin/oauth/access_token');
    assert.equal(capture.init.method, 'POST');
    assert.equal(capture.init.headers['Content-Type'], 'application/x-www-form-urlencoded');
    const body = new URLSearchParams(capture.init.body);
    assert.equal(body.get('grant_type'), 'client_credentials');
    assert.equal(body.get('client_id'), 'cid');
    assert.equal(body.get('client_secret'), 'csec');
});

test('the shop name is stripped of scheme and myshopify suffix', async () => {
    const capture = {};
    await getAccessToken({
        domain: 'https://my-store.myshopify.com',
        env: { SHOPIFY_CLIENT_ID: 'cid', SHOPIFY_CLIENT_SECRET: 'csec' },
        fetchImpl: fakeFetch(capture, { status: 200, body: { access_token: 't', expires_in: 86399 } }),
        ...noCache(),
    });
    assert.equal(capture.url, 'https://my-store.myshopify.com/admin/oauth/access_token');
});

test('shop_not_permitted explains that a client store needs another grant', async () => {
    // The raw error is opaque and is what an operator would otherwise see when
    // pointing the factory at a client's store.
    await assert.rejects(
        () => getAccessToken({
            domain: 'client-store.myshopify.com',
            env: { SHOPIFY_CLIENT_ID: 'cid', SHOPIFY_CLIENT_SECRET: 'csec' },
            fetchImpl: fakeFetch({}, { status: 400, body: { error: 'shop_not_permitted' } }),
            ...noCache(),
        }),
        /not in this app's Shopify organization/,
    );
});

test('no credentials at all names both accepted shapes', async () => {
    await assert.rejects(
        () => getAccessToken({ domain: 'x.myshopify.com', env: {}, ...noCache() }),
        /SHOPIFY_ADMIN_TOKEN/,
    );
});

test('credential detection matches the two shapes', () => {
    assert.equal(hasClientCredentials({ SHOPIFY_CLIENT_ID: 'a', SHOPIFY_CLIENT_SECRET: 'b' }), true);
    assert.equal(hasClientCredentials({ SHOPIFY_CLIENT_ID: 'a' }), false);
    assert.equal(storedToken({ SHOPIFY_ADMIN_TOKEN: 't' }), 't');
    assert.equal(storedToken({}), '');
});
