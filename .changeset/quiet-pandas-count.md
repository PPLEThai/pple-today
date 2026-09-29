---
'@api/backoffice': minor
---

Add `POST /external/notifications/app-install/count`, the bulk form of `GET /external/notifications/app-install`.

A broadcast preview needs to say "N will get the push, M will get the SMS fallback" for tens of thousands of numbers before it sends, and one request per number is too slow. This takes up to 10000 numbers and answers `{ total, withAccount, withPushToken, invalid }`: distinct well-formed numbers, how many a PPLE Today account holds, how many of those have a live push token (the rule `/send` uses to choose push over SMS fallback), and how many entries were not a complete Thai mobile number.

It answers counts only — never which numbers matched — so it cannot be used as a directory lookup, and it is gated like the single-number endpoint: an API token, with keys bound to a Builder App refused. The counts are two `COUNT` queries per chunk of 5000 numbers rather than a query per number.
