// Store domains arrive from two places: the client config and .env. An
// operator may type "Shop.Myshopify.com", "https://shop.myshopify.com" or add a
// trailing slash, and all three name the same store. Comparing the raw strings
// would reject a correct setup, or worse, miss that two different stores are
// involved.
export function normalizeDomain(value) {
    return String(value || '')
        .trim()
        .replace(/^https?:\/\//i, '')
        .replace(/\/+$/, '')
        .toLowerCase();
}

export function sameDomain(a, b) {
    return normalizeDomain(a) === normalizeDomain(b);
}
