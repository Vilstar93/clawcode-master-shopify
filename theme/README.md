# Master theme

This folder holds the master Shopify theme, shared by every client build.

It is empty on purpose. Add Dawn as a subtree so you can pull upstream updates:

```bash
git subtree add --prefix=theme https://github.com/Shopify/dawn.git main --squash
```

Update it later:

```bash
git subtree pull --prefix=theme https://github.com/Shopify/dawn.git main --squash
```

## Why Dawn

Dawn is Shopify's official reference theme. It is source-available, fast, and
Online Store 2.0 compatible. Building on it means upstream fixes stay mergeable.

## Brand customization

Do not hardcode brand values in templates. The build writes
`dist/<slug>/theme-settings.json`. Apply those values to
`theme/config/settings_data.json` and push. That keeps the theme mergeable.

## Push

```bash
node scripts/push-theme.mjs config/<client>.json
```

Always unpublished. Never publish without human review.
