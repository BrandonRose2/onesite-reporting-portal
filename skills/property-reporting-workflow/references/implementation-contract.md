# Property Reporting Implementation Contract

## Source Isolation

| Concern | Required separation |
|---|---|
| Provider catalog | Source-scoped records and external keys |
| Properties | Source-scoped directory and external identifiers |
| Execution | Source-specific runner route and token |
| Browser continuity | Authorized local profile per provider |
| Filing | `OneSite Reporting/...` and `Yardi Reporting/...` roots |

## Completed Report Artifacts

Persist metadata only. Store bytes in managed object storage.

| Field | Purpose |
|---|---|
| request ID | Traceability across queue, run, file, and review |
| source and property ID | Authorization and filing context |
| document kind | `source_report`, `property_workbook`, `workbook_html`, or `manager_checklist` |
| original filename, MIME type, storage key, size | Audit and retrieval |
| review state | Persisted verification and correction data |

## Review State

Keep report-derived rows stable using a source row identifier plus visible label. Store reported value, verification state, corrected value, note, and update time. Derive blockers from state rather than storing a separate untrusted completion flag.

## Approval Boundaries

| Action | Required authorization |
|---|---|
| Catalog/property read | Authorized local session; read-only operation |
| Queue report | Explicit user approval of settings and scope |
| Provider submission | Authorized local runner claims only the approved request |
| Manager review submit | All required row-level validations complete |
| Email delivery | Separate explicit final send confirmation |
