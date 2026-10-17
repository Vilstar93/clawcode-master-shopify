import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:https';
import { getCACertificates, setDefaultCACertificates } from 'node:tls';
import { importProducts, variantIdOf } from '../import-products.mjs';

// A real HTTPS server stands in for Shopify. It exercises the fetch call, the
// GraphQL envelope, and the response parsing, so nothing here is mocked. The
// certificate is a throwaway self-signed pair generated for this test only; it
// guards no secret and expires in 2036.
const KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCQwKGyNpOONmHX
gd+/kufXQ8TLoy76DGQXaoRRpqOxOootlq/iVCSFxmAVwfU9O/+WvfloRxfGc2Js
HpdAY8S+RxbGzw5TvOyPSr25ZDHDZ3LLLB5HxtdvU668IfrllIFAuR2D5XUNcC63
G08NN/H2ajjJkLCrBkfpJhFLVBNwTlQ+7AhhvH8zklAd0TDvuG4LTQ5TURPVD9Ip
zyIu7AB5j6bI0zWErgel5QpXquB8zlK2ZXkz2/E2xHaDqdhlNpn4pn0a/yCkB/Wu
bfBXFWfpKdHefbt8Sww4nJl8yUS0Y3PnjzmHr9hKJz8CLceyuLicGAsd9moVKKME
KcgnUd/5AgMBAAECggEAH8Lkt+HZxp6QIWVR3wsw677m83e+2wbU/35Twka6LC0Y
HKCvvw2PZfr9IkkIsoLztfPBQew3f0faFLcxoONDTCz1BnJwRldx4I8Zyg/+C04r
lgD8M+uhYcAO2yDpmG5ZXgZAP6ydXnF7DppjYhcgdF0iULf6y8v5A2Ni8BBmo4F3
4QHXJ95RIiRblAmGAdQSP+eRX4EmyVfqy/Ao0EG5w6wJj0Y0PhcJjT+CTSsj6ame
C8XLzNLDOdVnLSN21ccIvc2xcbtGUKDsaArlBD3EqwSIUCHvCWSzK/n72nPV3YLv
Momplm0XSO8Ys4Rhzqe/lOe7pVWUymfQtakgKYOV8QKBgQDFogDx3Y4YbTHw2Uth
yZbkvsCyWHgtTzRxSupgPadCYFYttonrvTMleKbB+g680g/ZvCimX+e1bSlEex1q
EX4aKTRW3Mij+i6d4RUGUzs3vwAGhQ8vBBDjkSgSJ7K5xpJk+1HiL1UoAaLZCk9A
6qnsBCi30RlB/8mLRhsqSC+BRwKBgQC7gJ4JK21njM/td4+HT0DeChO08AyzWYQk
xaHy/63QBMFR2NLyHU0H13zQJq5rydXn5d/UtDhPN51QUthFJUIssX6NpnOVlrUB
59mSXvOYC85xnOYgB10vH0f0RqNRuS2eYoEPR24G+yQFpVFLH+c84Usa9EG9Dhjl
Om2mTHI0vwKBgCQuWnntE7yJESGExnYqj8Nk4KZF6Apze6haDLp9zwcp190ak/li
c+CiS/UrMFOFKX21IsQCvsrKJ0nwOBxZA3sKnBhi5yCOBsbElDLKPgcgooKPDY6P
8f+XbXyVY/T604ZFNGJyQ+bFFekiKAw8actZn5K3ZyZcC6vBs+tzt661AoGAP2IJ
Cjx97UUyfKmwASOPX/+0DbQf9vjJrMyKJGS90tXoq8xJ8sJo6b+0V4Db8V/3ST7x
3StW5aB9M0vuA+HGbulJSIT+CZE6evxvFgW2/qzvCoTpXeZfX7CJWFAQoW2huCrA
SfPxg7adxLLPuj98oZ3fD6uGFWyQidyoeFDbQm0CgYAkUu0bTDfn3/6IGDTdC9jE
zwk1ymSQ2hzg2uK/NKauZORAmZK+Kv+jvz0vpH/GlXjVx6wtFU5aPBfcVERlfKPM
0Dwz9DcI4QLYL6o+OFaY8myXn2U0mRFVixhk2qPP0is/QifoPLTf2PRM0qcaxHoa
japuXV5Bs4uVTtryJKfzdQ==
-----END PRIVATE KEY-----
`;
const CERT = `-----BEGIN CERTIFICATE-----
MIIDGjCCAgKgAwIBAgIUP5NbhQ851skQpVVPfKbZzm9dTKEwDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJMTI3LjAuMC4xMB4XDTI2MTAxNzEwMjEzMFoXDTM2MTAx
NDEwMjEzMFowFDESMBAGA1UEAwwJMTI3LjAuMC4xMIIBIjANBgkqhkiG9w0BAQEF
AAOCAQ8AMIIBCgKCAQEAkMChsjaTjjZh14Hfv5Ln10PEy6Mu+gxkF2qEUaajsTqK
LZav4lQkhcZgFcH1PTv/lr35aEcXxnNibB6XQGPEvkcWxs8OU7zsj0q9uWQxw2dy
yyweR8bXb1OuvCH65ZSBQLkdg+V1DXAutxtPDTfx9mo4yZCwqwZH6SYRS1QTcE5U
PuwIYbx/M5JQHdEw77huC00OU1ET1Q/SKc8iLuwAeY+myNM1hK4HpeUKV6rgfM5S
tmV5M9vxNsR2g6nYZTaZ+KZ9Gv8gpAf1rm3wVxVn6SnR3n27fEsMOJyZfMlEtGNz
5485h6/YSic/Ai3Hsri4nBgLHfZqFSijBCnIJ1Hf+QIDAQABo2QwYjAdBgNVHQ4E
FgQUSiRvIYKC3deoCDjfJx2mtIrYFTEwHwYDVR0jBBgwFoAUSiRvIYKC3deoCDjf
Jx2mtIrYFTEwDwYDVR0TAQH/BAUwAwEB/zAPBgNVHREECDAGhwR/AAABMA0GCSqG
SIb3DQEBCwUAA4IBAQB9yB8Qo2uCrs4+7jIOc/Ib225TfVbyIrnY7GqESIgVKAEP
+OXNw8+6jNrLK8/tuiYTMAinjubws4P/ccfoQV/qB4x8ZJobdajD6M094tzcxhoU
p4As8rQ7M6TZvFByEY9jNJ/zVyws85veWUAFwMy/hQns2VZIIvwrcNXvEffpS1SP
o8hgNzOl9rhsmZ4vRvgJZxbZeWImu4Kui4f/W9UOT23XQvOu4/gijWz1yRd8ZZFq
BOTsHq9l30UpABeTAdgjS6L5AO7lPxYANAQkDQ23TUG88yQVwAVus9JC2i4etXhu
fnAQDNHVaRvWaQwGaFXVVTjKfOM0aq4/otZVEi78
-----END CERTIFICATE-----
`;

// The certificate is self-signed, so it is added to the trust store for the
// duration of this file. The default list is restored afterwards, which keeps
// the trust change from leaking into another test file.
const originalCAs = getCACertificates('default');
let server;
let requests = [];
let respond = () => ({ status: 200, json: {} });

before(async () => {
    setDefaultCACertificates([...originalCAs, CERT]);
    server = createServer({ key: KEY, cert: CERT }, (req, res) => {
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
            requests.push({ headers: req.headers, body: JSON.parse(body) });
            const { status, json } = respond(requests.length);
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(json));
        });
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
});

after(() => {
    server?.close();
    setDefaultCACertificates(originalCAs);
});

const domain = () => `127.0.0.1:${server.address().port}`;

const config = {
    client: { displayName: 'Тест Фирма' },
    products: [{ handle: 'svesht', title: 'Свещ', price: 24.9, description: 'Описание' }],
};

function productSetResponse(variantGid) {
    return {
        data: {
            productSet: {
                product: {
                    id: 'gid://shopify/Product/1',
                    handle: 'svesht',
                    title: 'Свещ',
                    variants: { nodes: variantGid ? [{ id: variantGid }] : [] },
                },
                userErrors: [],
            },
        },
    };
}

test('the numeric variant id is returned, not the GID', async () => {
    // The landing bundle sends this id to Shopify. A GID would be rejected.
    requests = [];
    respond = () => ({ status: 200, json: productSetResponse('gid://shopify/ProductVariant/59905305018713') });
    const [result] = await importProducts(config, { domain: domain(), token: 'shpat_x' });
    assert.equal(result.variantId, '59905305018713');
    assert.equal(result.ok, true);
});

test('a product with no variants leaves the id undefined', async () => {
    respond = () => ({ status: 200, json: productSetResponse(null) });
    const [result] = await importProducts(config, { domain: domain(), token: 'shpat_x' });
    assert.equal(result.variantId, undefined);
    assert.equal(result.ok, true);
});

test('the access token is sent as a header', async () => {
    requests = [];
    respond = () => ({ status: 200, json: productSetResponse('gid://shopify/ProductVariant/1') });
    await importProducts(config, { domain: domain(), token: 'shpat_secret' });
    assert.equal(requests[0].headers['x-shopify-access-token'], 'shpat_secret');
});

test('the product handle is sent as the identifier so re-imports update', async () => {
    requests = [];
    respond = () => ({ status: 200, json: productSetResponse('gid://shopify/ProductVariant/1') });
    await importProducts(config, { domain: domain(), token: 'x' });
    assert.equal(requests[0].body.variables.identifier.handle, 'svesht');
});

test('userErrors make the product not ok', async () => {
    respond = () => ({
        status: 200,
        json: {
            data: {
                productSet: {
                    product: null,
                    userErrors: [{ field: ['title'], message: 'Title is required' }],
                },
            },
        },
    });
    const [result] = await importProducts(config, { domain: domain(), token: 'x' });
    assert.equal(result.ok, false);
    assert.match(result.errors[0].message, /Title is required/);
});

test('a rejected token surfaces the actionable message', async () => {
    respond = () => ({ status: 401, json: {} });
    await assert.rejects(
        () => importProducts(config, { domain: domain(), token: 'bad' }),
        /SHOPIFY_ADMIN_TOKEN/,
    );
});

test('a dead host names the domain variable', async () => {
    await assert.rejects(
        () => importProducts(config, { domain: '127.0.0.1:1', token: 'x' }),
        /SHOPIFY_STORE_DOMAIN/,
    );
});

test('variantIdOf handles the shapes Shopify can return', () => {
    assert.equal(variantIdOf({ variants: { nodes: [{ id: 'gid://shopify/ProductVariant/42' }] } }), '42');
    assert.equal(variantIdOf({ variants: { nodes: [] } }), undefined);
    assert.equal(variantIdOf(null), undefined);
    assert.equal(variantIdOf({}), undefined);
});
