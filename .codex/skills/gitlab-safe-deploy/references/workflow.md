# Collaborative Workflow

## 1. Repository Entry

1. Confirm the workspace path and whether it is already a Git repository.
2. If it is not the target repository, clone the repo only after the user gives the remote URL or the URL is already known from context.
3. If it is already cloned, skip clone and inspect:
   - `git status --short --branch`
   - `git remote -v`
   - current branch name
   - default target branch for integration, usually `main`, `master`, `next`, or the branch named by the user
4. If the worktree has uncommitted changes, identify whether they belong to the current task. Do not overwrite or revert unknown user changes.

## 2. Branch Setup

1. Fetch remote state before starting substantive work.
2. Start from the target branch or from a branch explicitly chosen by the user.
3. Create or switch to a personal task branch. Prefer names like:
   - `codex/<short-task>` for Codex-authored work
   - `<owner>/<short-task>` when the user has a team naming convention
4. Do not develop directly on protected integration branches unless the user explicitly requires it.

## 3. Edit Safely

1. Read repository-level instructions before editing.
2. If the repository has edit-lock scripts or hotspot-file rules, claim the lock before touching those files.
3. Keep edits scoped to the task.
4. Run relevant local validation before committing when practical.

## 4. Commit Confirmed Changes

Trigger this phase only when the user explicitly says changes are confirmed, asks to commit, asks to save the current work as a commit, or asks to continue a larger workflow that includes committing. Do not commit merely because edits are complete.

1. Inspect `git status` and the diff.
2. Stage only files that belong to this task.
3. Commit with a clear message that explains user-visible impact.
4. If the project requires changelog or release-note updates, include them in the same commit.
5. Prefer small coherent commits over one large final commit.

## 5. Finish and Push

Trigger this phase only when the user explicitly says the task is complete and should be pushed, asks to push, asks to submit to GitLab, or asks to continue a larger workflow that includes pushing. Do not push merely because a commit exists.

1. Fetch the remote target branch.
2. Merge `origin/<target-branch>` into the task branch.
3. If conflicts occur, follow `conflict-policy.md`.
4. Run validation again after a clean merge or conflict resolution.
5. Push the current task branch.

## 6. Build and Upload to Remote Staging

Trigger this phase only when the user explicitly asks to build, deploy, update the server, upload artifacts, scp build output, update `public.new`, or asks to continue a larger workflow that includes build and staging upload. Do not build or upload merely because code has been pushed.

1. Repeat `git fetch origin` and `git merge origin/<target-branch>` immediately before building.
2. Stop if conflicts occur.
3. Build locally from the synchronized task branch.
4. Confirm the build output path.
5. On the server, prepare the staging destination such as `public.new`.
6. If `public.new` already exists, preserve it as `public.new.backup-YYYYMMDD-HHMMSS` or follow the user's stated retention policy.
7. Upload the new build artifacts into `public.new` only.
8. Verify key files in `public.new`.
9. Stop. Do not switch `public.new` to production `public`.

## 7. Completion Report

Report:

- branch name and latest commit
- remote sync result
- build command and result
- remote staging path updated
- verification performed
- whether any action remains for the project owner, especially production cutover
