'use strict';

// Shopify cart permalink checkout.
//
// This opens Shopify's hosted checkout WITHOUT an API token. The store domain
// is public; the variant id is public. No secrets are involved.
//
// Pattern proven in production by the vzgconsult-online project.

const PRODUCTS = require('./_products.js');

const DOMAIN = (process.env.SHOPIFY_STORE_DOMAIN || '{{storeDomain}}')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');

function buildCartUrl(variantId, quantity, properties) {
    const id = String(variantId).match(/(?:gid:\/\/shopify\/ProductVariant\/)?(\d+)$/);
    if (!id) throw new Error('invalid variant id');

    const qty = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
    const url = new URL(`https://${DOMAIN}/cart/${id[1]}:${qty}`);

    const props = Object.fromEntries(
        Object.entries(properties || {})
            .map(([k, v]) => [String(k).slice(0, 255), String(v || '').trim().slice(0, 500)])
            .filter(([k, v]) => k && v)
    );

    if (Object.keys(props).length) {
        url.searchParams.set('properties', Buffer.from(JSON.stringify(props), 'utf8').toString('base64url'));
    }

    return url.toString();
}

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ message: '{{msgMethodNotAllowed}}' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
        const product = PRODUCTS.find((p) => p.slug === body.slug);

        if (!product) {
            return res.status(400).json({ message: '{{msgUnknownProduct}}' });
        }
        if (!product.variantId) {
            return res.status(400).json({ message: '{{msgNoVariant}}' });
        }

        const url = buildCartUrl(product.variantId, body.quantity, body.properties);
        return res.json({ url });
    } catch (err) {
        console.error('[shopify-checkout]', err.message);
        return res.status(502).json({ message: '{{msgCheckoutFailed}}' });
    }
};

module.exports.buildCartUrl = buildCartUrl;
