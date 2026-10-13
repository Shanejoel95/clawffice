# Changelog

## 1.1.1 — 2026-10-13

- Fixed `/office debate <topic>`: it failed with "no command.run hook answered it" because it submitted the meeting prompt from inside the command handler. The prompt is now queued just after the command answers.
- Added a test that runs every `/office` subcommand.

## 1.1.0 — 2026-10-13

- Renamed from Shane Digital Studio to **Clawffice**. The plugin, marketplace and subagent types are now `clawffice` (`clawffice:developer`, …), and the default studio name is "Clawffice".
- Upgrading from `shane-digital-studio`: uninstall it, then install `clawffice`. Staff edits made under the old name don't carry over; re-apply them with `/office staff`.

## 1.0.0 — 2026-10-13

First public release.

- Office Manager prompt: every task becomes a ticket in `.office/tickets/`, is routed to a named specialist, and is reported with model, time, tokens and cost.
- Nine specialist agents (Product, Architect, Developer, QA, DevOps, Security, UX, Data, Support), registered from editable staff settings.
- Live timesheet: real duration, tokens and an approximate cost for every specialist job, in `.office/timesheet.md` and `.office/log.md`.
- Office floor panel: pixel crabs for every staff member, a live headline, desk details, and a meeting room for debates.
- Band above the prompt with the team and the current headline.
- `/office` command: floor, staff editor, debate, roster, timesheet, on/off.
- Settings: studio name, band style, auto-open floor, sequential specialists.
