# Homepage member/store script recovery

Baseline af853e1b. Scope: homepage core script only, plus regenerated index fingerprint. Other channels intentionally unchanged.

Contract: reuse existing member/store feature components and preload URLs; only replace their script lifecycle with an internal shared loader. Keep existing member CSS insertion, device-action bridge, loading/error markup and mount arguments. No design tokens, layout, private APIs or storage changes. Member CSS error recovery is not in scope.

Both feature promises share concurrent requests and reset after rejection. Script error, missing registration or 8000ms timeout removes the failed script and listeners; subsequent feature entry starts a fresh request. Success clears timers/listeners and preserves the loaded script. Already registered services bypass downloading. Existing connected/active-tab mount guards remain. Timeout does not guarantee browser transport cancellation; removed script may execute late, but its detached event listeners cannot settle or remove a newer request. There is no automatic retry loop or new retry button. Re-entering the view is the retry path.

Delta: reuse component/UI/cache URL contract; compose a private script loader; discard failed promise/script only. No new public API or official design-system component.

Validation: execute extracted real loader functions in a synthetic DOM with controlled script events and timers, no live customer/account data. 22 scenarios covering success, error/retry, fresh and existing-script timeout/retry, missing registration/retry, concurrent request reuse, registered fast path, tab change, detached host, late events and listener/timer cleanup. Baseline 11/22; candidate 22/22. These are isolated tests, not authenticated feature E2E. Check full script syntax, existing preload URL/fallback regressions, site whitelist/fingerprints and five public entrypoints before/after release. No speedup claim.

Release uses isolated worktree, scoped diff, latest production baseline/hash checks, shared lock, backup outside public and fast-forward merge. Rollback by reverting this scoped commit and validating p0 fingerprints; do not copy an older local site over production.
