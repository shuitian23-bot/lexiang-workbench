# leaibot.cn Project Rules

Use these rules when the repository or user request concerns `leaibot.cn`, `leaibot`, or `/opt/projects/lexiang`.

## Design and Content Rules

Before editing page style, interaction, components, or Chinese copy, read the repository's design skill:

`/opt/projects/lexiang/.codex/skills/lenovo-leai-pc-design/SKILL.md`

Then follow its required references, especially:

- `references/pc-design-system.md`
- `references/layout-rules.md`
- `references/component-patterns.md`
- `references/interaction-states.md`
- `references/content-voice.md`
- `references/real-pc-dialog-reference.md`
- `references/real-pc-dialog-states.md`
- `references/asset-inventory.md`

Do not introduce off-spec colors, purple gradients, glassmorphism, or marketing-page backgrounds unless the design skill allows them.

## Hotspot Locks

Before editing shared hotspot files such as `public/index.html`, `public/admin/*`, `server.js`, or `core/*`, claim the repository edit lock:

```bash
scripts/edit-lock.sh claim <task-id> <file>
```

Release the lock after commit, push, and any required upload work is complete.

## Changelog

For any change that is released to `leaibot.cn` front-stage experience or directly supporting content, update `public/changelog.json` in the same commit.

Write entries in plain Chinese that explain what users can perceive and why it helps. Do not write file names, function names, or technical implementation details. End each item with the modifier signature and token estimate in the project's required format.

Do not log unrelated infrastructure, GEO dashboard, generic workbench backend, or internal-only changes unless the project instructions say they directly affect front-stage experience.

## Required Route Checks

Before asking the project owner to switch `public.new` to production, verify the staged build or accessible environment for at least:

- `/`
- `/shop-chat`
- `/b-chat`
- `/biz-chat`

If these cannot be checked locally or against `public.new`, report that limitation clearly.

## Remote Upload Boundary

For this project, Codex's normal remote upload target is:

`/opt/projects/lexiang/public.new`

Do not replace `/opt/projects/lexiang/public`. The project owner performs the final production switch.

If `/opt/projects/lexiang/public.new` already exists, preserve it first as a timestamped backup such as:

`/opt/projects/lexiang/public.new.backup-YYYYMMDD-HHMMSS`

Then upload the new local build artifacts into a fresh `public.new` and verify key files such as `index.html`, static asset directories, and `changelog.json` when present.
