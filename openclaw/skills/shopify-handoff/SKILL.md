---
name: shopify-handoff
description: Write the client handoff document that lists what was built automatically and what a human must complete. Use at the end of every store build, before delivering to the client.
---

# Skill: Handoff document

Produces `dist/<slug>/HANDOFF.md`, the document the client actually reads.

## Trigger

"Prepare the handoff", "write the delivery document", "the store is ready to
hand over".

## Why it matters

The client does not care which scripts ran. They care what works, what they must
do, and what is still a draft. The handoff answers exactly those three things.

## Steps

1. Run the QA checks first. The handoff reports their result.
2. Run `node scripts/gen-handoff.mjs config/<client>.json --for "<client name>"`.
3. Review section 4 (Known gaps). Add anything the scripts cannot detect:
   - missing product photos
   - copy that needs a native speaker
   - integrations the client has not provided
4. Add notes for the next build in section 8.
5. Deliver the file with the store.

## What the script fills

Status table, artifacts, QA results, manual checklist, payment and shipping
summary, legal page list, contact block.

## What you must fill

- Real gaps the automated checks miss.
- Anything a human decided during the build.
- Notes that would help the next store.

## Rules

- Never mark a store ready while legal pages are unreviewed.
- Never remove a manual step to make the document look cleaner.
- List blockers explicitly. A hidden blocker becomes a client emergency.
- Keep it readable. The client is not a developer.

## The three sections that matter most

1. **Status at a glance** — one table, one overall verdict.
2. **Manual steps** — checkboxes the client works through.
3. **Known gaps** — the honest list. Never empty by accident.
