# Facebook page connect diagnostics

MPs who report that connecting their Facebook page "didn't work" rarely say
more. The mobile app therefore records every attempt and sends it to the API,
so support can see exactly what happened without asking them anything.

## What is recorded

One row in `FacebookConnectAttempt` per attempt. An attempt starts when the
user presses **เพิ่มเพจที่ดูแล** on the profile tab and ends when:

| `outcome`   | When                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------ |
| `SUCCESS`   | A page was linked                                                                          |
| `FAILED`    | Login, Graph `/me/accounts`, linking, or the iOS tracking permission failed                |
| `CANCELLED` | The user cancelled the Facebook login or the tracking-permission dialog                    |
| `ABANDONED` | The user left the page picker, went to Settings, or started a new attempt before finishing |

Columns: `id` (attempt id), `referenceCode`, `userId`, `outcome`, `failedStep`
(`tracking_permission`, `login`, `graph_accounts`, `link_page`), `platform`,
`osVersion`, `appVersion`, `buildNumber`, `errorDomain`, `errorCode`,
`errorMessage`, `context` (device model, whether the Facebook app is installed,
iOS tracking-permission status), `steps`, `startedAt`, `createdAt`.

`steps` is a JSON array of `{ at, name, data }`, `at` being milliseconds since
the button press:

| `name`                   | `data`                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `start`                  | `entry`: `profile_button`, or `page_picker` / `page_picker_retry` when the attempt began on the page picker                 |
| `tracking_prompt`        | iOS tracking status that made the app show its permission dialog                                                            |
| `tracking_prompt_result` | status after the system prompt                                                                                              |
| `cached_token`           | `result`: `none`, `missing_permissions` (+ `missingPermissions`), `refresh_failed` (+ `error`), `reused`                    |
| `login_start`            | the SDK login (Facebook app or browser) was opened                                                                          |
| `login_result`           | `result`: `success` (+ `grantedPermissions`, `declinedPermissions`, `expiresAt`), `cancelled`, `error` (+ `error`)          |
| `page_picker_open`       | `receivedLogin`: whether the screen got a token from the login step                                                         |
| `graph_accounts`         | `success` (+ `pageCount`, `pages` ids and names) or `error` (+ `status`, `code`, `subcode`, `type`, `message`, `fbtraceId`) |
| `linked_page_available`  | `availability` per page id, or `error`                                                                                      |
| `link_page_start`        | `pageId`                                                                                                                    |
| `link_page_result`       | `success`, or `error` (+ `status`, `code`, `message` from the API)                                                          |
| `end`                    | `outcome`                                                                                                                   |

The API also logs one line per attempt (`message: "Facebook connect attempt"`,
field `facebookConnectAttempt`), so recent attempts can be found in the logs
too.

**No secrets.** The app never records user or page access tokens: step data
drops any key containing `token`, `secret`, `password`, `authorization` or
`cookie` (which removes `access_token` from the Graph response), and all text
is scrubbed of token-like values. The API scrubs again before storing.

Known gaps: React Native drops `NSError.code`, so a native iOS login failure
carries only `errorDomain` (e.g. `com.facebook.sdk.login`) and an empty
`userInfo`, unless the SDK patch that puts the code into the message is
applied. `buildNumber` comes from the app config, which may be empty with EAS
remote versioning; `appVersion` is reliable.

## Reference codes

When an attempt fails, the error toast shows **รหัสอ้างอิง XXXXXX**: the first
six characters of the attempt id, from an alphabet without 0/O/1/I/L. Ask the
MP for a screenshot of the toast, then look up the code.

## Queries

By reference code (the code is not unique on its own across all time, so
check the user and time):

```sql
SELECT a."createdAt", u."name", u."phoneNumber", a."outcome", a."failedStep",
       a."platform", a."osVersion", a."appVersion",
       a."errorDomain", a."errorCode", a."errorMessage",
       a."context", jsonb_pretty(a."steps") AS steps
FROM "FacebookConnectAttempt" a
JOIN "User" u ON u."id" = a."userId"
WHERE a."referenceCode" = 'K7QX2M'
ORDER BY a."createdAt" DESC;
```

All attempts of one user, newest first:

```sql
SELECT a."createdAt", a."referenceCode", a."outcome", a."failedStep",
       a."errorDomain", a."errorCode", a."errorMessage",
       a."context"->>'facebookAppInstalled' AS fb_app,
       a."context"->>'trackingPermission' AS tracking,
       (SELECT string_agg(s->>'name', ' > ') FROM jsonb_array_elements(a."steps") s) AS steps
FROM "FacebookConnectAttempt" a
JOIN "User" u ON u."id" = a."userId"
WHERE u."phoneNumber" = '+66812345678' -- or a."userId" = '...'
ORDER BY a."createdAt" DESC
LIMIT 50;
```

Failures in the last 7 days, grouped by cause:

```sql
SELECT a."failedStep", a."platform", a."errorDomain", a."errorCode",
       count(*) AS attempts, count(DISTINCT a."userId") AS users,
       max(a."createdAt") AS last_seen,
       min(a."errorMessage") AS example_message
FROM "FacebookConnectAttempt" a
WHERE a."outcome" = 'FAILED' AND a."createdAt" > now() - interval '7 days'
GROUP BY 1, 2, 3, 4
ORDER BY attempts DESC;
```

Graph API failures with their `fbtrace_id` (give this to Facebook support):

```sql
SELECT a."createdAt", a."referenceCode", s->'data'->>'code' AS code,
       s->'data'->>'subcode' AS subcode, s->'data'->>'message' AS message,
       s->'data'->>'fbtraceId' AS fbtrace_id
FROM "FacebookConnectAttempt" a, jsonb_array_elements(a."steps") s
WHERE s->>'name' = 'graph_accounts' AND s->'data'->>'result' = 'error'
ORDER BY a."createdAt" DESC
LIMIT 50;
```

Users whose last attempt did not succeed:

```sql
SELECT * FROM (
  SELECT DISTINCT ON (a."userId") a."userId", u."name", a."createdAt", a."referenceCode",
         a."outcome", a."failedStep", a."errorDomain", a."errorCode"
  FROM "FacebookConnectAttempt" a
  JOIN "User" u ON u."id" = a."userId"
  ORDER BY a."userId", a."createdAt" DESC
) latest
WHERE latest."outcome" <> 'SUCCESS'
ORDER BY latest."createdAt" DESC;
```

## Retention

Rows are deleted 90 days after `createdAt`. There is no scheduled job for this:
`FacebookService.recordConnectAttempt` runs the delete at most once an hour per
API process, after storing an attempt (`createdAt` is indexed). If no attempts
arrive for a long time, old rows stay until the next one does.
