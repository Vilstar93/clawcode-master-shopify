---
name: shopify-theme
description: Set up, customize, and push the Shopify theme. Use when the user wants theme changes, brand colors applied, sections added, or a theme deployed to a store.
---

# Skill: Theme

Applies the client brand to the master theme and pushes it unpublished.

## Trigger

"Set up the theme", "apply the brand colors", "push the theme".

## Base theme

The master theme lives in `theme/`. It is a Dawn subtree:

```bash
git subtree add --prefix=theme https://github.com/Shopify/dawn.git main --squash
git subtree pull --prefix=theme https://github.com/Shopify/dawn.git main --squash
```

## Steps

1. Confirm `theme/` is populated (`theme/layout/` exists).
2. Read `dist/<slug>/theme-settings.json` (produced by `build-store.mjs`).
3. Map brand colors and typography into `theme/config/settings_data.json`.
4. Apply navigation from `theme-settings.json.navigation`.
5. Push unpublished:
   ```bash
   node scripts/push-theme.mjs config/<client>.json
   ```
6. Give the human the preview URL.

## Validation

Use the official Shopify plugin to validate Liquid before pushing:

```
openclaw plugins install npm:@shopify/ai-toolkit
```

It validates Liquid templates and GraphQL against Shopify's schemas.

## Rules

- Never publish to a live store. Push unpublished only.
- Keep Dawn's structure intact so upstream updates stay mergeable.
- Brand changes go in settings, not in hardcoded template edits.
