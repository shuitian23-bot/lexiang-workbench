# P0 order observer filtering

Baseline 13a42968. No layout, style, payment, order state or API changes. Only two observer paths changed:

- v102 still watches document child-list mutations to detect order-center mounts, but schedules rendering only if the change is within an order center or adds one (including a nested center). Unrelated page mutations no longer schedule synchronization.
- v104 collects matching pending cards before reading orders, deduplicates candidates in a Set, and reads one storage snapshot per mutation delivery. Detached nodes are ignored. Existing window/storage/pageshow refresh behavior is retained.

Real browser DOM isolation, memory-only synthetic storage and controlled timers: 100 unrelated additions with an order center mounted reduced combined storage reads 200 to 0 and scheduled order renders 100 to 0. One batch of 50 matching cards reduced reads 51 to 1. Eight mount/update/event/no-write cases pass for both baseline and candidate; the previous 13 order correctness cases also pass for the candidate.

These are synthetic work-count measurements, not a site load-time, CPU, LCP or network benchmark. The two lightweight document observers remain; other order/config/style observers are unchanged. Full shopping/model/payment E2E and five-channel browser performance remain outside this validation.

Serve the repository root and visit tests/p0-order-observers/index.html for the reproducible comparison. before-core fixtures contain the two public baseline scripts from 13a42968; after uses current production sources. All fixtures use in-memory fake storage in temporary iframes, with no production API calls. Previous tests/p0-orders/index.html remain unchanged.

Deployment uses an isolated branch with SHA checks, Git merge, asset fingerprint update and backup outside public. No backend or nginx restart. Rollback through scoped revert plus fingerprint verification, never by replacing user data.
