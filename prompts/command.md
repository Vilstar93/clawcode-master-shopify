# The one-shot command prompt

Paste this to the agent, with the client block filled in. That is the entire
input required to build a store.

---

## Command prompt

```
Build a complete Shopify store from the config below.

Follow AGENTS.md and playbooks/00-full-store-build.md exactly.
Validate the config first. Stop and ask if anything required is missing.
Push the theme unpublished. Never publish to a live store.
Mark legal pages as drafts for human review.

Create config/<slug>.json with this data, then run the full build:

--- CLIENT ---
slug:            <lowercase-slug>
legal name:      <registered company name or full personal name>
display name:    <brand name shown to customers>
locale:          <bg-BG>
country:         <BG>
currency:        <EUR>
email:           <contact email>
phone:           <phone>
vat id:          <VAT number or empty>
eik:             <company number or empty>
address:         <street>, <postal code> <city>, <country>

--- BRAND ---
tagline:         <one-line promise>
primary color:   <#hex>
secondary color: <#hex>
tone:            <voice, e.g. friendly and clear>
logo:            clients/<slug>/logo.png

--- STORE ---
domain:          <store>.myshopify.com
niche:           <what is sold>
audience:        <who buys>
usps:
  - <unique selling point>
  - <unique selling point>

--- PRODUCTS ---
List each product. If descriptions are missing, write them from the
product name, category, and tone. Batch up to 50 products per call.

1) handle: <handle>
   title: <title>
   price: <number>
   compare at: <number or empty>
   sku: <sku>
   stock: <number>
   category: <category>
   images: clients/<slug>/products/<file>.jpg

2) ...

--- COLLECTIONS ---
1) handle: <handle>
   title: <title>
   products: <handles>

--- PAYMENTS ---
methods: card, cod, bank_transfer

--- SHIPPING ---
carriers: econt, speedy
free over: <amount>
zones:
  - BG, rate <amount>

--- INTEGRATIONS ---
ga4:        <measurement id or empty>
meta pixel: <id or empty>
```

---

## What the agent does with it

1. Writes `config/<slug>.json`.
2. Validates it.
3. Runs the build.
4. Pushes the theme unpublished.
5. Imports products (if a token is available).
6. Generates and flags legal pages.
7. Runs QA.
8. Writes the handoff document.

## What stays manual

Payment credentials, tax settings, and legal review. These need account access
and human judgment. The agent prepares everything up to that line.
