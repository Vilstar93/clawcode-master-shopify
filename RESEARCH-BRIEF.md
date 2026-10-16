# Research brief: Shopify store factory + client onboarding portal

**Purpose:** Independent verification and research. This is a brief for external
AI systems (ChatGPT, MANUS) to fact-check and research, not a proposal to
approve.

**Instruction to the reviewer:** Be critical. If a premise is wrong, say so.
Cite sources for every legal claim. The author's own provisional conclusion is
stated in section 5 so it can be challenged.

---

## 1. What exists today (verified)

A working "store factory": one JSON client config in, one publishable Shopify
store out.

- Repo: `Vilstar93/clawcode-master-shopify`
- 58 files, ~971 lines of Node.js, zero runtime dependencies
- Tested: config validation, product CSV generation, Bulgarian legal page
  generation, landing page with Shopify cart-permalink checkout, QA checks,
  theme push, product import, GitHub Actions CI

**Not built:** no user interface, no database, no authentication, no payments
to the operator, no real customers.

**Known constraint:** the operator's GitHub integration cannot create new
repositories (`403 Resource not accessible by integration`). It can only push
to existing ones.

---

## 2. The proposal, decomposed

Four separate ideas with very different risk profiles:

| # | Idea | Risk |
|---|---|---|
| A | Client portal for entering company/legal data | Low |
| B | Uploading ID cards, bank statements, other documents | **High** |
| C | Digital product configurator with complexity-based pricing | Medium |
| D | "Certificate" issued for each created product | Unclear |

The proposal bundles these. They should be assessed separately.

---

## 3. Architecture under consideration

Operator wants to use **Lovable** (or similar) to generate the app, which
creates a GitHub repo and a Supabase database; the repo is then pulled locally.

**Why this is technically attractive:** Lovable creating the repo sidesteps the
`403` constraint in section 1.

**Research needed:**

1. Can Lovable generate a private Supabase storage bucket with Row Level
   Security policies, encryption at rest, and short-lived signed URLs?
2. What is Supabase's data residency, and does it offer a GDPR-compliant DPA?
3. Where physically are Supabase EU projects hosted?
4. Does Lovable's output remain fully owned and portable after export?

---

## 4. The core legal question

**If the operator collects scanned ID cards and bank statements from clients,
they become a GDPR data controller.**

That triggers: lawful basis, DPIA (Article 35 — scanned identity documents are
treated as high-risk by several EU supervisory authorities), Article 30 records,
Article 32 security measures, retention limits, and 72-hour breach notification.

GDPR Article 83 penalties:

- **Up to 20M EUR or 4%** of global turnover — breach of core principles or
  lawful basis (Art. 83(5)).
- **Up to 10M EUR or 2%** — failure of obligations such as DPIA, records, or
  security measures (Art. 83(4)).

For a small business both are existential. Note that the more probable harm is
not the fine: it is breach-notification duties, reputation damage, legal and
audit costs, and loss of client trust.

**But — is there any obligation to collect these documents at all?**

The operator provides web services. Under Bulgarian anti-money-laundering law
(ЗМИП, Art. 4), obliged entities are banks, financial institutions,
accountants, auditors, lawyers, notaries, corporate service providers, real
estate agents, high-value goods dealers, and crypto providers.
**A web services or IT provider is not on that list.**

**The central research question:**

> Does a web-services provider in Bulgaria have any legal obligation to perform
> KYC on its clients, and if not, what lawful basis exists for collecting
> scanned identity documents?

---

## 5. Author's provisional conclusion (to be challenged)

Public registries likely make the documents unnecessary:

| What you want to verify | How to verify it without an ID card | Cost |
|---|---|---|
| Company exists | Bulgarian Commercial Register, by EIK | Free |
| VAT number valid | EU VIES | Free |
| Person is real | Shopify already verified them for payouts | Free |
| Creditworthiness | Not assessed for prepaid services | N/A |
| Billing address | Self-declared | Free |

If true, collecting ID cards creates liability with no corresponding benefit.

**If identity verification is genuinely required**, the correct path is a
specialised provider (Stripe Identity, Persona, Onfido) that absorbs the
regulatory burden and stores the document — the operator receives only a
"verified" reference.

**Please confirm, refute, or refine this.**

---

## 6. Additional research questions

### Legal
1. Is there a lawful basis to collect ID cards from clients of a web services
   provider in Bulgaria?
2. What exactly does a DPIA require when processing scanned ID documents?
3. Is the Bulgarian Commercial Register queryable programmatically, and is
   there an official API?
4. What may a private party legally call a "certificate" without implying state
   accreditation or misleading the recipient?
5. What are the OSS (EU One Stop Shop) VAT obligations for selling digital
   services across the EU, and what is the current threshold?
6. Who is liable if Supabase suffers a breach of data the operator stored?

### Technical
7. Cost of Supabase storage for document-scale data (thousands of scans)?
8. How to implement automatic deletion after a retention period?
9. How to log and audit who viewed a document?
10. Can EIK and VAT validation be automated against official sources?

### Business
11. How many Bulgarian SMEs would plausibly buy this service?
12. What price does the market accept for a custom digital product?
13. What is the realistic delivery time per product?
14. What is the competitive advantage over hiring a freelancer directly?
15. What happens legally and commercially if a client rejects a delivered
    product?

---

## 7. Recommended phased approach

| Phase | Scope | Legal risk |
|---|---|---|
| 1 | Company data form + EIK/VAT auto-verification. No documents. | None |
| 2 | Digital product configurator with transparent pricing. No documents. | Low |
| 3 | Document collection — **only if Phase 1 proves registries insufficient** | High |
| 4 | Certificates — only after the term is defined precisely | Unclear |

Phases 1 and 2 deliver most of the value with none of the legal exposure.

---

## 8. What is missing for this to be a business plan

- Unit economics: cost per product, price, margin, break-even
- Market size: number of addressable Bulgarian businesses
- Competition: who does this today, at what price
- Distribution: how the first ten clients are reached
- Legal form and tax regime
- Client contract: scope, deadlines, rejection, liability

---

*Prepared by an AI agent (OpenHands) on request. This is not legal advice.
Section 6 legal questions require a Bulgarian lawyer versed in GDPR and ЗМИП.*
