# Portal Access Model

The OneSite Reporting Hub uses Manus OAuth for identity, while a portal-specific access directory determines whether an authenticated identity is approved for reporting data. RealPage credentials and the live Microsoft Edge session remain available only on the owner’s Mac runner and are never exposed to portal users.

| Portal role | Intended users | Allowed workflows | Property scope |
| --- | --- | --- | --- |
| Administrator | Owner and authorized reporting administrators | Full reporting dashboard, all properties, imports, report requests, runner status, access administration, and Manager Checklists | Full portfolio |
| Boss | Approved executive users | Reporting Overview, report archive, report request history, portfolio summaries, and Manager Checklists | Full portfolio, read-focused |
| Manager | Approved property managers | Assigned property Manager Checklists, property contact card, source-preview data, and filed report summaries | Explicit assigned properties only |
| Unapproved | Any Manus-authenticated identity without an active directory entry | Access-pending screen only; no reporting data | None |

The administrator access page will create or revoke directory entries by email. A manager entry can contain one or more assigned property IDs. The system will match the signed-in Manus account email against that directory at request time, so invites can be created before a user first signs in.

The deployment remains authenticated. The reporting portal does not expose RealPage login credentials, the live Microsoft Edge connection, or storage signing details to bosses or managers.
