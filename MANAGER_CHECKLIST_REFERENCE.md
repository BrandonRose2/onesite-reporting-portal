# Manager Checklist Reference

The user supplied two private archives on 2026-08-27: a 35-property Markdown checklist collection and a matching PDF collection. They are design and workflow references only; they are not copied into the portal or exposed to managers.

The Boca Ciega reference checklist uses the title **“Boca Ciega Townhomes — Manager Delinquency & Availability Checklist”** and the following verified sections:

1. Source Cross-Reference
2. Availability Follow-Up
3. Resident Balance Follow-Up — Amount Owed
4. Resident Balance Follow-Up — Prepaid / Credit
5. Resident Balance Follow-Up — Paid / Zero Balance
6. Manager Summary & Commitments

The row-level follow-up convention includes explicit manager actions such as **Contacted**, **Arrangement**, **Escalate**, **Confirm paid**, and a freeform Notes field. The portal implementation will preserve this review intent in persistent manager-confirmation records and a polished HTML workspace, while maintaining an exportable Markdown representation. Email dispatch remains disabled until separately authorized.

## Implementation note — 2026-08-27

The portal-hosted manager workspace derives initial editable review rows from each completed report’s preserved source workbook. Older generic checklist state is treated as unseeded so it cannot mask the actual report rows requiring validation. Manager-facing rows exclude Resh ID and Lease ID globally; those fields remain available only in the preserved original workbook.
