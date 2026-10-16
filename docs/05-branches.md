# Branch model

The factory uses branches to separate concerns. This keeps the agent's
configuration, the deliverables, and the improvements from tangling.

| Branch | Purpose | Who writes |
| --- | --- | --- |
| `main` | Stable factory: docs, playbooks, prompts, scripts. | You, on reviewed changes |
| `agent` | OpenClaw config, skills, tool wiring, model routing. | You, when tuning the agent |
| `store` | Generated store packages and client deliverables. | The agent |
| `commands` | The one-shot command prompts, per client type. | You |
| `optimizations` | Conversion, SEO, and performance improvements. | You and the agent |
| `theme-base` | The master Dawn theme. | Subtree updates |
| `legal-bg` | Bulgarian legal templates. | You, with legal review |

## Workflow

```
main          stable factory
  |
  +-- agent            tune the agent
  +-- commands         add a command prompt
  +-- theme-base       update Dawn
  +-- legal-bg         update legal templates
  +-- store            per-client output
        |
        +-- store/<slug>   one branch per client deliverable
```

## Rules

- `main` stays green: scripts must run.
- Client deliverables go on `store/<slug>`, not on `main`.
- Never commit secrets to any branch.
- Legal template changes need human review before merge.

## Creating the branches

```bash
for b in agent store commands optimizations theme-base legal-bg; do
  git checkout -b "$b" main && git push -u origin "$b"
done
git checkout main
```
