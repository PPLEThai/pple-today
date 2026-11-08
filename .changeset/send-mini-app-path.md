---
"@api/backoffice": patch
---

Let `POST /external/notifications/send` take a path-only mini-app link. `content.link.destination` may be `/approval/123`; the slug comes from `x-notification-app-key` and the stored link is the full redirect URL. A path with no app key is a 400. A full URL is unchanged.
