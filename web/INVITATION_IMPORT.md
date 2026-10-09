# Web invitation imports

Updated 2026-10-09.

## Import a CSV

1. Open **New meeting** or **Edit meeting**.
2. Under **Invite people**, choose **Download sample** for a template, or **Import CSV** for an existing file.
3. Review the names, email addresses, roles, and skipped-row explanations.
4. Choose **Add N invitees**, then edit individual names/roles if needed.
5. Save/create the meeting. Invitations use the existing backend, including in-app invitations and configured push delivery. Email delivery remains a separate setup task.

```csv
display_name,email,role
Alex Chen,alex@example.com,guest
"Taylor, Kim",taylor@example.com,co_host
```

`name` or `full_name` can replace `display_name`; `email_address` and the legacy Google `E-mail 1 - Value` heading are accepted email aliases. Headings are case-insensitive. Optional phone columns are ignored: invitations require email. Omitted/blank roles default to guest; co_host, co-host, co host, and cohost are accepted. Other roles are rejected. Files can use a UTF-8 BOM, quoted names, CRLF, or LF line endings.

Imports are limited to 500 rows and 1 MB per file. Parsing and preview occur locally. Invalid names/emails, duplicate addresses, invalid roles, and inconsistent row fields are skipped with explanations. Malformed quoting/missing required headings rejects the file. Duplicate emails are matched case-insensitively within the file and against existing invitees. No invitation is added until the host confirms; meeting saving is blocked while a preview is awaiting confirmation.

## Import device contacts

**Import contacts** is enabled only when the current browser exposes the Contact Picker API in a secure, top-level context and supports sharing email addresses. It requests only names/emails, runs directly from a button click, and previews the user's selections before adding them. Contacts with multiple emails produce one row per selected email; contacts without email are skipped. Cancelling leaves existing invitees unchanged.

As checked on 2026-10-09:

| Browser | Device contacts |
| --- | --- |
| Chrome on Android | Supported from Chrome 80 / Android M; runtime checks still apply |
| Desktop Chrome, Edge, Firefox, Safari | Not generally supported; CSV/manual fallback |
| Other browsers | Feature detection determines availability; CSV/manual fallback |

Sources: [Chrome Contact Picker documentation](https://developer.chrome.com/docs/capabilities/web-apis/contact-picker), [MDN browser compatibility](https://developer.mozilla.org/en-US/docs/Web/API/ContactsManager).

The browser picker grants access only to user-selected contacts for that request. It does not grant persistent address-book access. This implementation does not connect to Google Contacts or request OAuth access to cloud contacts.

## Validation

- Production type-check/build and public-only credential scan passed.
- Nine browser checks passed for import validation, responsive layouts, existing dashboard/settings, and authentication. After adding the pending-preview save guard, the four import checks passed again.
- Contact API selection/cancellation and unsupported-browser fallback were tested with browser fixtures; actual native contact selection still needs a manual Android Chrome check.
- Firebase deployment completed at https://conference-79cf2.web.app. A temporary host imported two rows through the deployed Edit meeting UI; the backend returned two saved invitations with guest/co_host roles, with no browser page errors. Temporary meeting/account data was removed after revoking the test sessions.
- An additional real-backend localhost check timed out before Edit meeting and did not change invitation data. The hosted backend permits only WEB_ORIGIN in backend/supabase/functions/_shared/client.ts, currently the Firebase origin; local real-backend testing requires a separate development-origin configuration. Local browser fixtures test the import flow independently, and the deployed real-backend check passed.
