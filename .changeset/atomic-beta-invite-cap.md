---
'@api/backoffice': patch
---

Make the Beta invite seat cap atomic under concurrency

- Claiming a tester seat now runs in a single DB transaction that locks the app row before counting held invites and upserting, so two concurrent creates at seat 19 cannot both insert.
- The 20-tester limit stays a service-level constant (`MINI_APP_INVITE_LIMIT`); over-cap still returns `MINI_APP_INVITE_LIMIT_EXCEEDED` naming the limit, and re-opening a declined invite still re-checks the cap.
