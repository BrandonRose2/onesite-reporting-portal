# Recovered Prototype Specification

## Source and confidence

This specification records only the details visibly confirmed in the recovered two-page PDF prototype, `aptcorp-property-reports-prototype.pdf`. It is the visual checkpoint for the rebuild; implementation details not visible in the prototype remain subject to the preserved runner contract and explicit recovery requirements.

## Verified visual language

The prototype is an internal operations dashboard with a **deep navy left rail**, a calm pale-gray workspace, white elevated cards, soft rounded corners, restrained shadows, and a teal-to-indigo hero gradient. Typography is compact and editorial, with small tracked all-caps labels, strong dark headings, and muted descriptive copy. Teal is the primary positive/operational accent; a warm ochre accent is used for manager follow-up.

The top of the content workspace carries the breadcrumb **Property Reports / Home** and a mint status pill reading **Prototype · Sample Data**. The product mark is **ApartmentCorp Property Reports**. The recovered artifact is clearly a prototype, so the rebuilt application will retain a prominent sample-data label whenever it displays non-production records.

## Verified information architecture

| Navigation group | Visible destinations | Rebuild interpretation |
|---|---|---|
| Pull Reports | Pull Reports – OneSite; Pull Reports – Yardi | Two runner-aware request entry points, with OneSite as the initial full workflow and Yardi shown as a scoped operational path. |
| Review Reports | Home; Report Library; Compare Periods | Dashboard, document/request library, and a comparison workspace. |
| Portfolio | Properties; Manager Checklists | Property directory and operational follow-up context. |
| Operations | Import Data; Automation Settings; Portal Access | Controlled operations for recovery data imports, runner status/configuration, and internal-user access. |

## Verified home dashboard

The home screen opens with a hero titled **AptCorp Property Reports** and the purpose statement, “Request, file, review, and follow up on property reporting in one secure workspace.” It presents three primary action cards:

| Card | Visible purpose | Rebuild destination |
|---|---|---|
| Request a report | Search Delinquency and approved OneSite reports, configure settings, and request every property at once. | Report request workflow with catalog, scope, format, and parameters. |
| Review property reporting | Navigate the current Delinquency snapshot, archived reports, and property-level reporting context. | Report Library and property document history. |
| Manager follow-up | Open property checklists with manager contact details, availability notes, and resident balance follow-up. | Manager Checklists and property detail context. |

The lower section is titled **Quick Look / Previously pulled reports** with a **View all reports** control. A visible report card carries the report name **Delinquency**, a completed status, a pulled date, a filed-workbook count, and a details action. The rebuilt dashboard will use this as the basis for a real request/document history preview, rather than recreating static placeholder data.

## Explicit recovery rules

1. Preserve the calm operational hierarchy and grouped navigation rather than substituting a generic analytics dashboard.
2. Keep known operational limitations visible, including the runner’s unverified My Reports discovery path.
3. Never put runner credentials, RealPage credentials, session cookies, or access tokens in client code, repository files, or the database.
4. Keep runner-required catalog metadata: exact report name, report area, report level, product, available formats, and report parameters.
5. Build with verified empty states and no fabricated reports, property data, customer reviews, or user-generated content.
