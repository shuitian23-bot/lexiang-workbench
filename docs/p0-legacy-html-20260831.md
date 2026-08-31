# Archive full legacy HTML, retain redirect compatibility

Baseline 64c6dd56. shop-chat.html, b-chat.html, biz-chat.html contained full obsolete pages (368648 bytes total). No literal references found in the remaining public HTML/JS/CSS/JSON. This does not establish absence of external bookmarks.

Keep existing nginx302 mappings unchanged. Archive original bytes outside public at backups/p0-legacy-html-20260831/before/public/leaip0/ before merge. Replace full pages with small compatibility documents at the same names. Static HTTP previews without nginx redirect rules now also navigate to the canonical channel directories. location.replace uses a fixed relative path and appends location.search and location.hash; no query-controlled redirect. JavaScript-disabled local previews show a manual link; parameter/fragment preservation is guaranteed only with JavaScript or the production HTTP redirect, not the static manual fallback. file:// is not a supported full preview mode.

Only three legacy HTML files change; current five entries, assets, product data and nginx/backend are untouched. Keep legacy files in asset/release entry lists: they now contain no external resources. Do not delete old referenced assets in this change. Archive manifest includes original hash and size. Source is also recoverable from the preceding Git commit.

Validate static browser redirects with encoded queries/fragments, existing production HTTP redirects and final page200, release/fingerprint checks and all other site hashes. No performance speedup claim: production already redirects these URLs, so this reduces obsolete public content and local-preview confusion, not live homepage transfer. Rollback only this scoped commit via Git, never copy an old full local site over production.
