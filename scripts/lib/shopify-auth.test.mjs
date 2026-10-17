import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { authorizeUrl, verifyHmac, extractCode, exchangeCode, SCOPES } from '../shopify-auth.mjs';

test('the authorize URL carries the scope, redirect and state', () => {
    const url = authorizeUrl({
        shop: 'my-store.myshopify.com',
        clientId: 'cid',
        redirectUri: 'https://example.com/auth/callback',
        state: 'abc123',
    });
    const u = new URL(url);
    assert.equal(u.origin, 'https://my-store.myshopify.com');
    assert.equal(u.pathname, '/admin/oauth/authorize');
    assert.equal(u.searchParams.get('client_id'), 'cid');
    assert.equal(u.searchParams.get('scope'), 'write_products');
    assert.equal(u.searchParams.get('redirect_uri'), 'https://example.com/auth/callback');
    assert.equal(u.searchParams.get('state'), 'abc123');
});

test('write_products is the only scope requested', () => {
    // The import calls productSet and nothing else. Extra scopes only widen what
    // a leaked token can reach.
    assert.equal(SCOPES, 'write_products');
});

test('a correctly signed redirect verifies', () => {
    const secret = 'shpss_test';
    const params = new URLSearchParams({ code: 'abc', shop: 's.myshopify.com', state: 'xyz', timestamp: '123' });
    const message = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('&');
    params.set('hmac', createHmac('sha256', secret).update(message).digest('hex'));
    assert.equal(verifyHmac(params.toString(), secret), true);
});

test('a tampered redirect is rejected', () => {
    // Without this check any page could hand the operator a code, and the token
    // stored in .env would belong to an app nobody approved.
    const secret = 'shpss_test';
    const params = new URLSearchParams({ code: 'abc', shop: 's.myshopify.com', state: 'xyz' });
    const message = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('&');
    params.set('hmac', createHmac('sha256', secret).update(message).digest('hex'));
    params.set('code', 'attacker');
    assert.equal(verifyHmac(params.toString(), secret), false);
});

test('a redirect with no hmac is rejected', () => {
    assert.equal(verifyHmac('code=abc&shop=s.myshopify.com', 'shpss_test'), false);
});

test('the code is read from a full redirect URL', () => {
    const url = 'https://example.com/auth/callback?code=abc123&hmac=deadbeef&shop=s.myshopify.com&state=x&timestamp=1';
    assert.equal(extractCode(url), 'abc123');
});

test('the code is read when only the code was copied', () => {
    assert.equal(extractCode('  abc123  '), 'abc123');
});

test('an empty paste yields no code', () => {
    assert.equal(extractCode(''), '');
    assert.equal(extractCode('https://example.com/auth/callback?hmac=deadbeef'), '');
});

test('the exchange posts the code as a form body', async () => {
    let captured;
    const token = await exchangeCode({
        shop: 'my-store.myshopify.com',
        clientId: 'cid',
        clientSecret: 'csec',
        code: 'abc123',
        fetchImpl: async (url, init) => {
            captured = { url, init };
            return new Response(JSON.stringify({ access_token: 'shpat_new' }), { status: 200 });
        },
    });
    assert.equal(token, 'shpat_new');
    assert.equal(captured.url, 'https://my-store.myshopify.com/admin/oauth/access_token');
    const body = new URLSearchParams(captured.init.body);
    assert.equal(body.get('code'), 'abc123');
    assert.equal(body.get('client_id'), 'cid');
    assert.equal(body.get('client_secret'), 'csec');
    assert.equal(body.get('grant_type'), null, 'the code grant does not send grant_type');
});

test('a rejected exchange surfaces the status', async () => {
    // Shopify answers an OAuth error with an HTML page, not JSON. That is what
    // the token endpoint did for this store's client ID, so the message has to
    // be useful without a JSON body to read.
    await assert.rejects(
        () => exchangeCode({
            shop: 's.myshopify.com', clientId: 'cid', clientSecret: 'csec', code: 'bad',
            fetchImpl: async () => new Response('<html><title>400 - Oauth error invalid_code</title></html>', { status: 400 }),
        }),
        /returned 400 and no JSON/,
    );
});

test('a JSON error body is surfaced too', async () => {
    await assert.rejects(
        () => exchangeCode({
            shop: 's.myshopify.com', clientId: 'cid', clientSecret: 'csec', code: 'bad',
            fetchImpl: async () => new Response(JSON.stringify({ error: 'invalid_code' }), { status: 400 }),
        }),
        /Token exchange failed \(HTTP 400\)/,
    );
});
