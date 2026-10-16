# Shopify affiliate integration — constraints

**Affiliate link (operator's, registered to the German entity):**

```
https://shopify.pxf.io/7950557-link?sharedid=7950557
```

`pxf.io` is the Impact.com network. `sharedid` is Impact's cross-visible
parameter.

**Status:** constraints documented, integration not yet built. Read this before
writing any redirect code.

---

## 1. Do not overwrite `sharedid`

The reference implementation in `VZGplattform` uses:

```ts
url.searchParams.set(subIdParam, clickId)
```

`URLSearchParams.set` **replaces** an existing value. If `subIdParam` is
configured as `sharedid`, the platform's click id overwrites `7950557` and the
operator's own attribution can break.

**Correct approach:** keep `sharedid=7950557` untouched and use `subId1` for the
platform's click id:

```
https://shopify.pxf.io/7950557-link?sharedid=7950557&subId1=<click_id>
```

Impact supports `subId1`, `subId2`, `subId3` (partner-visible) alongside
`sharedid` (both sides). The operator's identifier must survive.

**Verify before any traffic:** click a test link, confirm the click appears in
the Impact dashboard and that `sharedid` is unchanged.

---

## 2. Shopify affiliate program rules that apply

These apply to the **account and the operator's behaviour**, not to the country
of the legal entity. Registering in Germany does not change them.

### 2.1 The operator is a "tool partner"

Shopify defines this as affiliates operating as store builders or apps. That is
exactly this business.

> "All affiliates operating as a tool partner (store builders, apps, etc.) must
> disclose any and all traffic sources to the Shopify Affiliate Compliance
> Team."

Obligation: declare traffic sources to Shopify.

### 2.2 The link must not fire until the user is in the flow

> "Tool partners are not permitted to initiate the affiliate link until the end
> user is in the tool partner's user flow. This should be after any information
> gathering (email, other contact info) with a CLEAR and DIRECT instruction to
> click the affiliate link to open their Shopify store."

This matches the planned form: collect data first, then present a clear button.
It must not be a silent redirect.

### 2.3 No extra windows, tabs, or iframes

> "There should be no additional windows, tabs, or iframes created to activate
> the affiliate link."

The click must be a real user action in the same flow.

### 2.4 No sub-affiliate networks

> "We are no longer working with sub-affiliate networks... As of February 2026,
> we no longer permit any operation of a sub-affiliate network within our
> program. If you operate as a network, your account will be removed."

**This is the real risk if the operator and the affiliate account holder split
commission.** Resolve this before building. See section 3.

### 2.5 Prohibited and required wording

Required: disclose affiliate status and that commission may be earned.

Compliant:
- "Аз съм Shopify афилейт и мога да получа комисионна, ако създадеш магазин
  през линка ми"

Prohibited:
- "Shopify ми плаща да строя магазини"
- "Shopify ме нае да ти помогна"
- "Shopify плаща за твоя магазин"

No wording implying employment or endorsement by Shopify.

### 2.6 Domain

The promotional domain must not contain "Shopify" or a misspelling of it.
Trademark violation.

### 2.7 Bidding

"Shopify" must be in the negative keyword list for any paid search. No bidding
on Shopify brand terms.

---

## 3. Open questions before building

| # | Question | Why it matters |
|---|---|---|
| 1 | Is commission split with the affiliate account holder? | Determines whether this is a prohibited sub-affiliate network |
| 2 | Who is the affiliate of record? | Legal responsibility |
| 3 | Are traffic sources declared to Shopify? | Tool-partner obligation |
| 4 | `subId1` for click id, keeping `sharedid`? | Otherwise attribution breaks |
| 5 | What domain, without "Shopify"? | Trademark |
| 6 | Which entity is GDPR controller for client data? | Two companies, one platform |
| 7 | Is the digital product sold through Shopify or separately? | Tax treatment |
| 8 | Is there a contract between the two entities? | Otherwise informal |

---

## 4. Design requirements for the form

Derived from the rules above:

1. Data collection happens **before** the affiliate link is presented.
2. A clear, explicit button labelled to say it opens Shopify.
3. No auto-redirect, no popup, no hidden iframe.
4. Affiliate disclosure visible **before** the button, not only in a footer.
5. The button performs a normal navigation in the same tab.
6. `sharedid` is preserved; click id goes in `subId1`.
7. If the partner URL is not configured, the button must not render.
8. Disclosure text must not claim Shopify pays for building the store.

---

## 5. Verification checklist before paid traffic

- [ ] Click a test link and confirm it appears in the Impact dashboard
- [ ] Confirm `sharedid=7950557` is unchanged in the final URL
- [ ] Confirm `subId1` carries the platform click id
- [ ] Confirm no popup, new tab, or iframe is created
- [ ] Confirm the disclosure is visible before the button
- [ ] Confirm the wording matches the compliant examples in section 2.5
- [ ] Confirm the domain contains no "Shopify" string
- [ ] Confirm traffic sources are declared to Shopify if required
- [ ] Confirm the commission-split question in section 3 is resolved

---

*Constraints verified against the Shopify Affiliate Program Compliance
Guidelines and Impact.com partner documentation. Not legal advice.*
