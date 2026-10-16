# OpenClaw agent setup

## What OpenClaw is

OpenClaw is a self-hosted agent runtime and message router. It runs on your
machine, connects chat apps to a model, and gives the model tools: shell, files,
browser. It is the harness. It is not the brain and it knows nothing about
Shopify on its own.

You supply two things:

1. **A model** (API key or local).
2. **Plugins and skills** (capabilities).

## Step 1: install OpenClaw

Follow the official install for your platform. Verify:

```bash
openclaw --version
openclaw --help
```

## Step 2: give it a model

Pick one from `docs/03-ai-providers.md`. The cheapest useful setup:

- Gemini free tier as default
- Groq for overflow
- Local Ollama for drafts

Put keys in `.env` or your shell profile. Never commit them.

## Step 3: install the Shopify plugin

This is the step most setups miss. Without it the agent cannot validate Liquid
or GraphQL, and it will guess.

```bash
openclaw plugins install npm:@shopify/ai-toolkit
```

Alternatives:

```bash
openclaw plugins install clawhub:@shopify/ai-toolkit
openclaw plugins install git:github.com/Shopify/Shopify-AI-Toolkit
```

## Step 4: point OpenClaw at this repo

Copy `openclaw/config.example.yaml` to your OpenClaw config location. Set:

- `agent.workspace` to the absolute path of this repo
- the model providers you enabled
- the tool allowlist

Verify the plugin loaded:

```bash
openclaw plugins list
```

## Step 5: first run

```bash
# In the repo:
cp config/client.example.json config/test-client.json
node scripts/validate-config.mjs config/test-client.json
node scripts/build-store.mjs config/test-client.json
node scripts/qa-check.mjs config/test-client.json
```

Then ask the agent: "Build the store from config/test-client.json following
AGENTS.md."

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Agent does nothing | No model configured | Set an API key |
| Agent guesses at Shopify APIs | Shopify plugin missing | Install `@shopify/ai-toolkit` |
| Command not found | `openclaw` not on PATH | Fix PATH or reinstall |
| Theme push fails | Not logged into Shopify CLI | `shopify auth login` |
| Import fails with 401 | Bad Admin token | Regenerate in Shopify admin |

## Why it may not have worked before

Three common causes, in order:

1. No model was configured, so the agent had no brain.
2. No Shopify plugin, so it could not act on Shopify.
3. Node or version mismatch.

Give the agent the model and the plugin, point it at this repo, and it has
everything else it needs.
