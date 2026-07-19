---
'@api/backoffice': minor
'@pple-today/api-common': minor
---

Full-phone identity lookup for Collaborators

- `POST /platform/users/lookup` resolves a complete mobile number to `{ sub, name }` behind the platform service token, so the Provisioner can ask an Owner to confirm a masked name before granting Collaborator access. Exact match only — incomplete or malformed numbers are reported as not-found and never searched as prefixes.
- `isThaiMobileE164` is extracted into `@pple-today/api-common` and shared with Beta invite phone validation, so "whole Thai mobile after normalisation" is one check rather than two copies of the same regex.
