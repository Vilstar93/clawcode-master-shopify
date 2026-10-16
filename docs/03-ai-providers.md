# AI providers: cheap bulk work, expensive only for architecture

The point: do not burn an expensive model on bulk work. Route by task.

## Providers

| Provider | Free tier | Cost after | Use for |
| --- | --- | --- | --- |
| Google AI Studio (Gemini) | Generous free tier | Flash-Lite is very cheap | 90% of work: copy, SEO, emails |
| Groq | ~500K tokens/day, no card | Llama 3.1 8B is the cheapest listed | Overflow, fast bulk |
| DeepSeek | No fixed limits | Flash tier is cheap; cache hits are far cheaper | Long-context, cached prompts |
| Qwen | via Groq / OpenRouter | Mid | Alternative bulk |
| Local (Ollama) | Free | Free | Drafts, zero-token iteration |

Verify current prices on the official pages. Aggregator sites drift.

## The routing

```
default    -> Gemini Flash-Lite   (free tier)     bulk copy, SEO, emails
bulk       -> Groq Llama 8B                        overflow
reasoning  -> DeepSeek                             long context, caching
drafts     -> Ollama (local)                       zero-cost first pass
architect  -> expensive model                      architecture, debugging
```

## Two ways to cut token spend

**1. Prompt caching.** Keep the system prompt byte-identical across calls.
Providers with caching bill cached input at a fraction of the normal rate.
Never re-send a changing preamble.

**2. Batching.** Never one item per request. Send 50 products in one call.
This cuts both token overhead and request count.

## Local models

```bash
ollama pull qwen2.5:14b
ollama serve
```

Point any OpenAI-compatible client at `http://localhost:11434/v1`.

Use local models for first drafts. Review and polish with a hosted model only
when needed.

## Setup

Put keys in `.env` (gitignored):

```
GEMINI_API_KEY=
GROQ_API_KEY=
DEEPSEEK_API_KEY=
```

The agent reads these. The build scripts do not.
