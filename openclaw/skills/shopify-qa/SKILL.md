---
name: shopify-qa
description: Run pre-handoff verification on a built store package and report blockers. Use before delivering a store to a client.
---

# Skill: QA and handoff

Verifies the store package before it reaches the client.

## Trigger

"Run the checks", "is it ready", "QA the store", "prepare the handoff".

## Steps

1. Run `node scripts/qa-check.mjs config/<client>.json`.
2. Report every failed check as a blocker with the fix.
3. For checks that need a human (legal review, payment credentials), list them
   explicitly under "Manual steps".
4. Write `dist/<slug>/HANDOFF.md`.

## Handoff template

```markdown
# Store handoff: <displayName>

## Built automatically
- Theme pushed (unpublished): <preview url>
- Products imported: <n>
- Collections: <n>
- Legal pages generated: <n> (DRAFT)

## Manual steps required
- [ ] Review legal pages (Общи условия, Поверителност, Право на отказ)
- [ ] Enable payment provider in Shopify admin
- [ ] Configure shipping rates and carriers
- [ ] Set tax settings
- [ ] Verify email sender domain
- [ ] Publish theme after review

## Known gaps
- ...
```

## Rules

- A failed check is a blocker, not a warning.
- Never mark a store ready while legal pages are unreviewed.
- The handoff must list what was done automatically and what a human must do.
