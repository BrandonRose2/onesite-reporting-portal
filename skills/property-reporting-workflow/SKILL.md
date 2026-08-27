---
name: property-reporting-workflow
description: Run secure property-reporting workflows from source catalog discovery through parameterized request, original-file filing, HTML presentation, property-scoped manager and regional review, and later approval-gated email. Use when building, extending, or operating OneSite, Yardi, or another property-management reporting portal and local runner.
---

# Property Reporting Workflow

Use this workflow for internal property-reporting systems that collect a provider report, preserve its original output, create a management-friendly HTML view, and obtain property or regional-manager validation.

## Non-Negotiable Security Boundary

1. Keep each provider source isolated: separate catalog, property directory, runner endpoint family, local browser profile, token, and storage root.
2. Never store provider usernames, passwords, browser cookies, session tokens, MFA codes, or CAPTCHA data in the portal, database, client, repository, or generated documentation.
3. Use only an explicitly authorized, provider-permitted local browser session for provider interaction. Require the operator to complete MFA or CAPTCHA; do not bypass either.
4. Treat portal request creation as distinct from provider execution. Require the user’s explicit approval immediately before a queued request is submitted to the provider.
5. Do not send external email automatically. Model email as a later, explicit-confirmation action.

## Workflow

### 1. Establish the Source Contract

For each source, maintain independent values for `source`, catalog key, property key, runner health, runner token, property storage root, report storage root, and permitted formats. Do not reuse OneSite identifiers for Yardi.

Before synchronization, confirm the active provider page and read-only session readiness. For paged catalogs, parse the provider’s displayed total and fail closed unless the deduplicated collected count matches it. Never deactivate existing catalog rows from a partial or filtered source read.

### 2. Synchronize Catalog and Properties Safely

Treat the authoritative provider catalog and the authoritative property selector as separate data sources when they are separate in the provider UI. Validate a complete catalog payload with `complete: true` and `expectedTotal === reportCount` before stale records are deactivated.

Preserve report-specific parameter definitions in catalog metadata. A generic catalog refresh must not erase known parameter definitions merely because it lacks them.

### 3. Capture Actual Report Settings

Inspect settings without generating the report. Model controls with explicit keys, labels, types, options, defaults, and validation. Keep source-specific parameter application in the local runner.

For a new report run, present a concise review containing the source, exact title, format, scope, selected property or all-properties scope, and all material settings. Obtain explicit approval before creating or submitting the request.

### 4. Execute and File Reports

Use the authorized local runner to claim only the approved request, verify the selected property set and required settings in the provider UI, then submit the report. If the provider download occurs locally, file the original output without modifying it.

For every property artifact:

| Artifact | Requirement |
|---|---|
| Original provider file | Preserve as the audit source, with original filename and MIME type. |
| Storage location | File under the source root, property, date, and request identifier. |
| HTML rendition | Generate a separate management-facing representation; never substitute it for the original. |
| Request record | Record source, property association, status, output references, completion time, and warnings. |

When several local downloads have similar names, require an explicit path or a deterministic, logged newest-file selection. File the original first. Do not let optional HTML rendering prevent original-file preservation.

### 5. Present Reports in the Portal

Provide a property filing hub with searchable, sortable request history. Each completed report row should link to:

1. a management HTML view;
2. the preserved original download; and
3. the manager review workspace.

For delinquency reports, use a focused management table rather than a raw spreadsheet dump. Prefer the current resident, delinquency, current/30/60/90 aging, permitted contact information, and move-in/out information. Hide source-only identifiers and accounting columns from the manager-facing display while retaining them in the original workbook. Offer a default-on non-zero balance filter.

### 6. Manager and Regional Review

Create an authenticated HTML workspace per completed report and property. Match property and regional contacts only from an authorized directory snapshot or permitted synchronization process. Restrict non-admin access to properties assigned to the signed-in user.

Derive review rows from the available report data. Each row should support:

- reported value;
- verified/needs-correction state;
- corrected value when needed;
- manager note when corrected; and
- automatic save.

Show a progress bar and a red **Needs Attention** list beside **Submit for Review**. Each blocker must link to, scroll to, and focus its corresponding row. Disable submission until every required verification and correction explanation is complete. Submission records review status and timestamp only; it does not send mail.

Generate Markdown from the persisted review state, not a transient browser-only state. Markdown is an export and audit representation; the portal HTML workspace is the editable experience.

### 7. Later Email Stage

Only implement after the user explicitly authorizes it. Draft, do not send, messages that link to the authenticated HTML checklist and summarize saved corrections. Let authorized users edit recipients and CC recipients. On final confirmation, send the manager’s submission to the designated sender and configured CC recipients, with auditable delivery status.

## Reusable Data Contracts

Load `references/implementation-contract.md` before adding schema, runner, or review features. It defines the required source isolation, filing, and review fields.

## Completion Checklist

- Verify types, tests, and desktop plus narrow-phone layouts.
- Verify a completed property report appears in the property filing hub with original, HTML, and review actions.
- Verify a non-admin account cannot open another property’s review by direct URL.
- Verify an incomplete review cannot submit and each blocker navigates to the relevant control.
- Verify no outbound email occurs without a new explicit user confirmation.
