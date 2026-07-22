---
name: gitlab-safe-deploy
description: Conflict-aware GitLab development, commit, merge, build, and staging-deployment workflow for collaborative projects. Use when Codex is asked to clone or work in an already-cloned repository, create a task branch, commit changes, sync with a GitLab remote, resolve merge conflicts, build artifacts, upload artifacts by scp/ssh, or prepare leaibot.cn public.new without switching production public.
---

# GitLab Safe Deploy

## Core Rules

Use this skill to keep collaborative GitLab work synchronized and to prevent accidental production overwrites.

Treat an already-cloned repository as the normal entry point. Clone only when the current workspace is not the target repository or the user explicitly asks to clone.

Do not switch, replace, delete, or move the production `public` directory during the normal deployment flow. The deployment endpoint is uploading and verifying `public.new`; the project owner performs the `public.new` to `public` switch.

Do not continue past unresolved merge conflicts, failed builds, failed uploads, or failed staging verification. Report the exact stop point and preserve evidence.

Do not run `git add`, `git commit`, `git push`, build commands, or scp/ssh upload commands unless the user explicitly asks for that phase or explicitly asks to run the complete workflow through that phase. By default, code-change requests stop after edits and validation.

## Workflow Routing

Choose the phase from the user request and repository state:

- Start work: read `references/workflow.md`, then run repository, remote, branch, and dirty-worktree checks.
- Make code changes: follow the repository's own instructions first, then use the branch and lock rules in `references/workflow.md`.
- Commit confirmed changes: read `references/workflow.md` and commit only task-related files.
- Finish and push a task: read `references/conflict-policy.md`, then fetch and merge the target branch before pushing.
- Build or deploy artifacts: read `references/workflow.md` and `references/conflict-policy.md`; for leaibot.cn also read `references/leaibot-project-rules.md`.
- Work on leaibot.cn: always read `references/leaibot-project-rules.md` before editing, committing, building, or uploading.

## Required Git Pattern

Prefer explicit synchronization commands so Codex can reason about the source of changes:

```bash
git fetch origin
git merge origin/<target-branch>
```

Use `git pull` only when the repository or user explicitly prefers it. Before building or uploading artifacts, repeat the fetch-and-merge check even if it was done earlier in the task.

## Deployment Boundary

For remote static artifact deployment, upload into a staging directory such as `public.new` and verify key files there. Never perform the production cutover unless the user explicitly says they are the project owner and asks for that cutover.

When `public.new` already exists, protect it before replacing it: rename or copy it to a timestamped backup, or ask the user if server storage policy is unclear. This backup is for the staging directory only; production `public` remains untouched.
