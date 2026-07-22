# Conflict Policy

## Merge Conflicts

1. Stop normal progress as soon as Git reports conflicts.
2. List conflicted files.
3. Read both sides of each conflict before editing.
4. Preserve user or teammate intent whenever it can be inferred.
5. Ask the user when a conflict changes product behavior and neither side is clearly correct.
6. After resolving, run the relevant validation again.
7. Commit the merge or conflict resolution only after validation passes or after reporting why validation could not run.

## Dirty Worktree Conflicts

If local uncommitted changes exist before syncing:

- If the changes are known task work, commit or stash them before merging.
- If they appear to be user or teammate changes, do not overwrite them.
- If the repository rules require a checkpoint commit, create a clearly labeled checkpoint before starting new work.

## Build-Time Race Protection

A successful push is not enough to guarantee the build uses the latest remote state. Always fetch and merge the target branch again immediately before building artifacts for upload.

If a new remote change appears during this final sync:

1. Merge it.
2. Resolve conflicts if any.
3. Re-run validation.
4. Build only after the branch is clean and synchronized.

## Upload Failures

If scp/rsync/ssh upload fails:

1. Do not retry by writing into production `public`.
2. Leave the existing production directory untouched.
3. Report whether `public.new` is incomplete.
4. If a previous `public.new` backup exists, mention it as the recovery source.

## Production Cutover

The normal workflow never performs production cutover. Do not execute commands that rename, delete, replace, symlink, or otherwise switch the live production `public` directory unless the user explicitly states they are the project owner and asks for that specific cutover.
