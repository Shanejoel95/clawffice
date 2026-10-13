# Shane Digital Studio

A virtual software agency inside Claude Code. Your session becomes **Shane(Manager)**, an Office Manager who turns every request into a ticket, hands it to the right specialist, and reports back with the model used, time taken, tokens and an approximate cost.

The team shows up as pixel crabs: on a band above the prompt and on an office floor panel, with a live headline of who is doing what.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install shane-digital-studio --marketplace Shanejoel95/shane-digital-studio
```

Answer `y` to add the marketplace, then pick a scope (user scope makes it available in every session). The office opens from your next message.

## The team

| Agent | Role | Default model |
|---|---|---|
| Shane(Manager) | Office Manager (your main session) | inherit |
| Alex(Product) | Product Manager | sonnet |
| Sara(Architect) | Software Architect | opus |
| Joel(Developer) | Full-stack Developer | sonnet |
| Maya(QA) | QA Engineer | sonnet |
| Nina(DevOps) | DevOps Engineer | sonnet |
| Omar(Security) | Security Reviewer (read-only) | opus |
| Priya(UX) | UX/UI Designer | sonnet |
| Liam(Data) | Data & Optimization Analyst | opus |
| Zoe(Support) | Technical Writer / Support Lead | haiku |

Each specialist is a subagent type (`shane-digital-studio:developer`, `shane-digital-studio:qa`, …) with its own tools, remit and personality. Rename anyone, rewrite their personality and house rules, or change their model with `/office staff`, or just ask the Manager.

## What it does

- **Tickets and a log.** Work is tracked in `.office/tickets/OFFICE-NNN.md` and `.office/log.md` in your project.
- **Real timesheets.** When a specialist finishes, the mod records the actual duration, tokens and an approximate cost in `.office/timesheet.md`, and hands the figures to the Manager for the ticket.
- **A proper workflow.** Complex work goes Product → Architect → Developer → QA; production changes add Security and DevOps.
- **Meetings.** `/office debate <topic>` (or "hold a meeting on …") gathers 3–5 people whose roles and personalities disagree usefully. They argue over two rounds and the Manager decides. The floor shows a meeting room with everyone's stance.
- **Live visuals.** A band above the prompt shows the team and the current headline ("Shane(Manager) assigned 'Implement login API' to Joel(Developer)"). The office floor panel shows everyone at a glance, with desk details on demand.

## Commands

| Command | What it does |
|---|---|
| `/office` or `/office floor` | Open or close the office floor |
| `/office staff` | Open the staff editor |
| `/office debate <topic>` | Call a meeting on a topic |
| `/office roster` | Print the roster |
| `/office timesheet` | Show this project's timesheet |
| `/office off` / `/office on` | Turn the office persona off or on (remembered) |

## Settings

Set in `/config`, or in `~/.claude/settings.json` under `pluginConfigs`:

```json
{ "pluginConfigs": { "shane-digital-studio": { "options": { "studioName": "Acme Labs", "band": "compact" } } } }
```

| Option | Default | Meaning |
|---|---|---|
| `studioName` | `Shane Digital Studio` | Name used in the panel, band, prompts and log |
| `band` | `full` | `full` (crabs + headline), `compact` (headline only), `off` |
| `autoOpenFloor` | `true` | Open the floor when a specialist starts or a meeting is called |
| `sequentialAgents` | `true` | Run specialists one at a time so handoffs are ordered and timesheets exact |

## Costs

Costs are estimates from token counts and list prices per million tokens (input/output): Opus $5/$25, Sonnet $3/$15, Haiku $1/$5, Fable $15/$75; cache reads count at 0.1× and cache writes at 1.25×. They are not a bill. Override the rates per project in `.office/rates.json`:

```json
{ "opus": [5, 25], "sonnet": [3, 15] }
```

## Privacy

Everything stays on your machine: tickets, logs and the timesheet are files in your project, and staff settings live in Claude Code's plugin store. The mod sends nothing anywhere.

## Development

```
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

The crab sprites and walk cycle are adapted from [savvy-progress](https://github.com/johnnyvizz/claude-kit/tree/main/plugins/savvy-progress) (MIT).

## License

MIT
