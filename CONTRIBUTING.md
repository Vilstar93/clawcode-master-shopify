# Contributing

## Running the factory

```bash
npm run validate -- config/client.example.json
npm run build    -- config/client.example.json
npm run products -- config/client.example.json
npm run legal    -- config/client.example.json
npm run qa       -- config/client.example.json
```

## Adding a script

1. Put it in `scripts/`.
2. Export a function for reuse; guard the CLI part with the
   `import.meta.url === file://${process.argv[1]}` check.
3. Add it to `package.json` scripts.
4. Document it in `AGENTS.md` and the relevant playbook.

## Changing the config schema

1. Edit `config/client.schema.json`.
2. Update `config/client.example.json`.
3. Update `scripts/lib/validate.mjs` if the new keyword is unsupported.
4. Run the example through validate and build.

## Adding a skill

1. Create `openclaw/skills/<name>/SKILL.md`.
2. Include frontmatter: `name`, `description` with trigger phrases.
3. Write steps, rules, and stop conditions.
4. Link it from `AGENTS.md`.

## Legal templates

Legal text needs human review. When you change a template, say so in the commit
and flag it in the pull request. Never remove the DRAFT stamp from the generator.

## Style

- No dependencies unless they earn their place.
- Scripts must run on Node 20+.
- Keep docs in English; client-facing content follows the client locale.
