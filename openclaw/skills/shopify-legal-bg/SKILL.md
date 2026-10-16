---
name: shopify-legal-bg
description: Generate Bulgarian legal pages (General Terms, Privacy Policy, Withdrawal Right, Shipping & Payment, Company Details). Use when a store needs legal pages for the Bulgarian market.
---

# Skill: Bulgarian legal pages

Generates the mandatory legal pages for a Bulgarian webshop.

## Trigger

"Add the legal pages", "generate terms and privacy", "make the shop compliant".

## Pages produced

| File | Page |
| --- | --- |
| `obshti-usloviya.html` | Общи условия |
| `poveritelnost.html` | Политика за поверителност |
| `pravo-na-otkaz.html` | Право на отказ и връщане |
| `danni-za-firmata.html` | Данни за фирмата |
| `dostavka-i-plashtane.html` | Доставка и плащане |

## Steps

1. Confirm the config has `client.legalName`, `client.eik`, `client.vatId`,
   `client.address`, `client.email`, `shipping.carriers`, `legal.returnDays`.
2. Run `node scripts/gen-legal.mjs config/<client>.json`.
3. Every page is stamped **ЧЕРНОВА — изисква правен преглед**.

## Hard rules

- These are **drafts**. A qualified person must review them before publishing.
- Do not invent an EIK, VAT number, or address. If missing, stop and ask.
- Do not promise a return window longer than the law requires unless the client
  confirms it.
- Never present generated legal text as legal advice.

## Required values

The agent must refuse to generate if any of these is empty:

- `client.legalName`
- `client.eik`
- `client.address.street`, `client.address.city`
- `client.email`
