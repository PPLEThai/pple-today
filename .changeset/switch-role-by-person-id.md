---
'@client/mobile': patch
---

Switch บทบาท by person, so two delegates no longer collapse into one option

- SSO now selects the active AD person by `pple_person_id` and lists every approved row on userinfo as `ad.eligiblePersons`. Switching by `role` could not tell two `delegate` rows apart — they collapsed to one option in both บทบาท pickers.
- Both pickers (the แอป-page control and the open-miniapp prompt) now share a radio dialog keyed on person id. Delegates show `supervisor_full_name · supervisor_role_label` under the role name; the compact แอป-page trigger still shows `role_label` only. Confirm commits the switch; tapping a radio does not.
