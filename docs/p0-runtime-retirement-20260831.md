# Remove 64 retired P0 runtime scripts

User explicitly requested deletion of the 64 versioned runtimes identified in the current audit. Baseline 1a82d0bf. Exact paths, sizes and SHA256 are recorded in the manifest; 37390292 bytes total. Delete only those 64 assets; preserve current five entry runtimes, all CSS/images/product data and legacy HTML redirect shims.

Before deletion verify each hash. No filename references found in previously scanned P0 HTML/JS/CSS/JSON, or this follow-up scan of tracked project JS/JSON/HTML/CSS/Python/shell/config/TS files <=8MB, excluding docs/tests/skills and symlinks, or enabled nginx site configs. This is static evidence, not proof against dynamically constructed filenames, untracked files or external requests. No private access logs or customer data read. User-authorized removed script URLs return404; do not redirect to different runtime code.

Edit isolated server worktree, validate remaining assets and whitelist, then under shared lock verify production baseline/index/hashes, archive original bytes outside public with mode0700 at backups/p0-runtime-retirement-20260831/before/public/leaip0/, and merge scoped Git commit. Verify archived hashes and that all surviving site files have unchanged hashes. Record changelog and check current entrypoints/resources plus deleted URL404 after merge. No homepage speedup claim: these assets were not in current entry HTML.

Rollback using scoped Git revert after confirming latest production changes; original bytes also preserved in archive and preceding Git commit. Never restore a whole old local site over production.
