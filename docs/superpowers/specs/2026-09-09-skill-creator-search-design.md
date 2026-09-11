# Skill creator search

The user requests a creator search field in the existing Skill management filter bar. Add a separate search input using the same owner account shown in the table. Match case-insensitive substrings after trimming the query, combined with existing name, status, category and summary filters. An empty query imposes no additional restriction; missing owners do not match nonempty queries.

Preserve live filtering and cached values. Reset the creator query alongside other filters on summary-card selection. Reuse the current toolbar/input styles, keep actions together and wrap by content width. No store, permission, lifecycle or other Hub-tab changes.

Verify actual browser filtering, combinations, empty results, reset paths and narrow content with the Agent open. Run project-required checks, publish to new only and record the release. This is a small reversible UI enhancement; do not add implementation-mirroring tests.
