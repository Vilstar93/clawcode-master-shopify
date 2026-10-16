# Building the autonomous agent

How to stand up the OpenClaw agent that runs this factory, and how to get the
most out of a ChatGPT Plus subscription while doing it.

This is the practical build guide. Read it once, then keep it as reference.

---

## 1. What you are building

An agent that takes one client config and produces a working Shopify store:
theme pushed, products imported, legal pages generated, QA run, handoff written.

It has three layers. Miss one and it will not work.

| Layer | What it is | What breaks without it |
| --- | --- | --- |
| **Runtime** | OpenClaw. The harness that runs the loop and gives tools. | Nothing runs at all. |
| **Brain** | A model behind an API key. | The agent has no reasoning. It sits idle. |
| **Capability** | Plugins and skills. Shopify knowledge, shell, files. | The agent guesses and hallucinates APIs. |

Most failed setups are missing the **brain** or the **capability**. Not the runtime.

---

## 2. Prerequisites

```bash
node --version          # 20 or newer
npm --version
openclaw --version      # the runtime
shopify version         # the Shopify CLI
git --version
```

Install what is missing:

```bash
npm i -g @shopify/cli
# OpenClaw: follow the official install for your platform
```

---

## 3. Step 1 — Install OpenClaw

Follow the official install. Then verify the binary is on your PATH:

```bash
which openclaw
openclaw --help
```

If `openclaw` is not found, fix your PATH before continuing. Nothing else works
until the command resolves.

---

## 4. Step 2 — Give the agent a brain

This is the step people skip. OpenClaw ships without a model. You must connect one.

Get at least one key. The cheapest useful combination:

| Role | Provider | Why |
| --- | --- | --- |
| Default | Google AI Studio (Gemini) | Generous free tier |
| Overflow | Groq | ~500K tokens/day free, very fast |
| Long context | DeepSeek | Cheap, and cache hits are far cheaper |
| Drafts | Ollama (local) | Zero cost, runs on your machine |
| Architect | An expensive model | Only for hard problems |

Put the keys in `.env` (gitignored):

```
GEMINI_API_KEY=...
GROQ_API_KEY=...
DEEPSEEK_API_KEY=...
```

For a fully free local setup:

```bash
ollama pull qwen2.5:14b
ollama serve
```

Then point a provider at `http://localhost:11434/v1`.

Full detail: `docs/03-ai-providers.md`.

---

## 5. Step 3 — Install the Shopify plugin

**This is the step that was missing.** Without it the agent does not know
Shopify's APIs and will invent them.

```bash
openclaw plugins install npm:@shopify/ai-toolkit
```

Alternatives if npm fails:

```bash
openclaw plugins install clawhub:@shopify/ai-toolkit
openclaw plugins install git:github.com/Shopify/Shopify-AI-Toolkit
```

Verify it loaded:

```bash
openclaw plugins list
```

What it gives the agent:

- Search over Shopify docs and API schemas
- **Validation of GraphQL queries and Liquid templates** against real schemas
- Store management through the Shopify CLI

That validation is the difference between an agent that guesses and one that
knows.

---

## 6. Step 4 — Point the agent at this repo

```bash
git clone https://github.com/Vilstar93/clawcode-master-shopify.git
cd clawcode-master-shopify
```

Copy `openclaw/config.example.yaml` to your OpenClaw config location. Set:

- `agent.workspace` — the absolute path to this repo
- the model providers you enabled in Step 2
- the tool allowlist (keep it tight)

The config routes work by cost:

```
default    -> Gemini Flash-Lite   free tier        bulk copy, SEO, emails
bulk       -> Groq Llama 8B                        overflow
reasoning  -> DeepSeek                             long context, caching
drafts     -> Ollama (local)                       zero-cost first pass
architect  -> expensive model                      architecture, debugging
```

---

## 7. Step 5 — Give it a client

```bash
cp config/client.example.json config/my-client.json
# fill in the client's data
node scripts/validate-config.mjs config/my-client.json
```

Or paste `prompts/command.md` to the agent with the client block filled in and
let it write the config itself.

---

## 8. Step 6 — Run the build

Two ways.

**Manual, to prove the pipeline:**

```bash
node scripts/build-store.mjs config/my-client.json
node scripts/qa-check.mjs    config/my-client.json
```

**Autonomous, through the agent:**

> Build the store from config/my-client.json. Follow AGENTS.md and
> playbooks/00-full-store-build.md.

The agent reads the playbook, runs the phases, and stops at the manual line
(payments, tax, legal review).

---

## 9. Step 7 — Add the theme

The theme folder is empty on purpose. Add Dawn as a subtree:

```bash
git subtree add --prefix=theme https://github.com/Shopify/dawn.git main --squash
```

Update it later without losing your work:

```bash
git subtree pull --prefix=theme https://github.com/Shopify/dawn.git main --squash
```

---

## 10. Why it may not have worked before

In order of likelihood:

| Symptom | Cause | Fix |
| --- | --- | --- |
| Agent does nothing | No model configured | Step 2 |
| Agent invents Shopify APIs | Plugin missing | Step 3 |
| `openclaw: command not found` | PATH | Reinstall or fix PATH |
| Theme push fails | Not logged into Shopify CLI | `shopify auth login` |
| Import returns 401 | Bad Admin token | Regenerate in Shopify admin |

---

## 11. Maximizing a ChatGPT Plus subscription

Plus is built for **use through the interface**, not the API. That is its
strength. Use it for thinking and per-client work. Use cheap APIs for volume.

### The single highest-value habit: Projects

Create one Project called **Shopify Store Factory**. Upload once:

- `AGENTS.md`
- `playbooks/00-full-store-build.md`
- `prompts/system.md` and `prompts/command.md`
- the legal templates in `templates/legal-bg/`
- a brand guide and tone-of-voice note

Now every new client is a **new chat inside that project**. The context is
already there. You never re-explain. This is the biggest saving available and
it costs nothing.

### Custom GPT

Turn the project into a Custom GPT with the same instructions and files. You get
a reusable "Store Builder" assistant with a fixed behaviour.

### Deep Research

For each client, run a research pass before building:

- competitors in their niche
- price positioning
- keyword and category ideas
- audience and objections

This is what Plus does far better than a plain chat, and it does not burn your
generation quota the way bulk output does.

### Canvas and Code Interpreter

- Generate and clean the product CSV.
- Convert a client's messy spreadsheet into `config/client.json`.
- Validate JSON, fix formatting, compute margins.

Do the data work here, then hand the file to the agent.

### Vision

Upload product photos. Get titles, descriptions, alt text, and SEO metadata.
Faster than describing each product in words.

### Voice

Quick decisions away from the desk. Good for reviewing a build, not for
producing it.

### The division of labour

| Task | Where |
| --- | --- |
| Strategy, per-client reasoning, research | ChatGPT Plus |
| Bulk copy for 50+ products | Gemini free tier / Groq / DeepSeek |
| Drafts you will edit anyway | Local Ollama |
| Hard architecture and debugging | An expensive model, sparingly |

Plus handles **judgement**. The APIs handle **volume**. Do not pay Plus prices
for bulk text, and do not pay API prices for thinking.

### Two habits that cut cost everywhere

1. **Keep the system prompt byte-identical** across calls. Providers with
   caching bill cached input at a fraction of the normal rate. Never re-send a
   changing preamble.
2. **Batch.** Never one product per request. Send up to 50 in one call.

---

## 12. What the agent must never do

- Read, write, or echo secrets.
- Publish a theme to a live store.
- Publish legal pages without human review.
- Enter payment credentials.

The agent prepares everything up to those lines and hands over clearly.
