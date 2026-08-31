# Home member/store preload reuse

Baseline 02b6d7c5. Home preloads member JS/CSS and store JS with p0v content hashes, while its lazy loaders use URLs without p0v. Those URLs are distinct cache/preload keys. Other canonical channels do not have these three matching preload tags; their runtime files remain unchanged.

Change only three expressions in home.ref-sync-v140.js: choose the existing matching preload link href (rel/as/exact filename plus query prefix); fall back to the original URL if absent. This automatically follows future static preload fingerprint updates. No new loader, global interception, member/store component content, promise/error handler or UI flow is introduced. Keep preloads for fast first entry; no claim of lower initial page transfer.

Verification: actual candidate expressions resolve all three current home preloads including p0v, and preserve all three missing-tag fallbacks. In a local inert-resource browser fixture, preload then dynamic loading produces six resource entries before and three after; all loads complete. These are synthetic cache-key tests, not logged-in member/store E2E or latency benchmarks. Three real production gzip payloads sum to 147739 bytes; avoiding duplicate transfer depends on cache state, successful preload and which features are opened.

Tests/p0-feature-cache/test.cjs validates the actual HTML preload URLs and fallback expressions. Network fixture results are in p0-feature-cache-before/after.json. No private member data, payment, device binding or store appointment was accessed or submitted.

Deployment through isolated worktree and scoped Git merge, backup outside public, regenerate direct runtime fingerprint and validate release. Only home runtime plus home HTML fingerprint change. Other site file hashes must remain unchanged. Existing error/retry behavior has not been improved by this patch. Rollback by scoped Git revert and fingerprint validation.
