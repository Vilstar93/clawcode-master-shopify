# Payments, shipping, and taxes for Bulgarian stores

## Payments

Shopify Payments availability depends on the merchant's country. If it is not
available for the client, use a local or European provider.

| Provider | Notes |
| --- | --- |
| Shopify Payments | Simplest if available. Card payments, payouts. |
| Stripe | Broad coverage, good API, supports subscriptions. |
| Unzer | Hosted Payment Page v2. Already integrated in the sibling `vzgconsult-online` repo. |
| Paypercut | Local option. |
| Cash on delivery (COD) | Manual payment method. Common in BG. |
| Bank transfer | Manual payment method. |

Payouts: the client connects their own bank account in the provider dashboard.
The agent must never handle payout credentials.

## Shipping (Bulgaria)

| Carrier | Integration |
| --- | --- |
| Econt | API + Shopify app |
| Speedy | API + Shopify app |

Typical setup:

- Zone: Bulgaria, rate from `config.shipping.zones`.
- Free shipping over `config.shipping.freeOver`.
- Handling time: 1 business day.
- Transit: 1-2 business days.

## Taxes

- Prices in the config are end prices including VAT.
- Bulgaria standard VAT rate: 20%.
- Cross-border EU sales: check the OSS threshold.
- The agent configures settings; the accountant confirms them.

## Invoices

Bulgarian merchants need compliant invoices. Options:

- A Shopify invoicing app (Bulgarian NAP-compatible).
- The merchant's accounting software integration.

The agent does not generate tax invoices.

## Checklist before going live

- [ ] Payment provider enabled and test transaction completed
- [ ] Shipping rates match the config
- [ ] Tax settings confirmed by the accountant
- [ ] Refund policy published
- [ ] Payout bank account connected by the client
