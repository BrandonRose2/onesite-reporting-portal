# RealPage Runner Integration Notes

## Source and Purpose

The non-secret tested runner was transferred from the user’s local `realpageclient` project and reviewed from `scraper/runScrape.ts` and `scraper/realpageClient.ts`. It provides the browser-automation workflow that the portal’s current Automation Settings and queued scrape-run records need to dispatch.

## Confirmed Workflow

The runner logs in once to the RealPage Unified Platform using a persistent Microsoft Edge profile. It then opens the Reports Hub at `https://www.realpage.com/reporting/reports`, generates **Delinquent and Prepaid (Excel)** and **Availability (PDF)** for all selected properties, waits for individual property reports to complete, downloads each file, and records a per-property result while continuing after individual failures.

The two report definitions require exact matching:

| Report type | Exact Reports Hub row | Required format |
|---|---|---|
| Delinquency | `Delinquent and Prepaid (Excel)` | Excel |
| Availability | `Availability` | PDF |

The Reports Hub generation panel uses its defaults for fiscal period and subproperty. It must select **all properties** in the `Select Property` control. The completed-report panel has a distinct `Select Properties` filter that must also be set to all properties before completed rows are counted or downloaded.

## Persistent-Session Requirement

The runner launches Microsoft Edge with a persistent profile directory. The initial interactive setup handles RealPage 2FA and establishes device trust. Later scheduled headless runs reuse this profile. If RealPage re-prompts for 2FA, an administrator must repeat the interactive trusted-session setup.

## Portal Integration Boundary

The existing portal service persists `retrievalAutomations` configuration and queues `scrapeRuns`, but does not yet dispatch the browser runner. The runner integration must:

1. Accept a queued portal run plus its property/report parameters.
2. Use the persistent profile and stored RealPage credentials.
3. Upload downloaded XLS/PDF files into the portal’s secure object storage rather than relying on runner-local archive directories.
4. Create or update reporting-period snapshots, property summaries, resident ledger rows, source-file records, and scrape-run progress/results.
5. Preserve every warning and per-property failure in the portal’s run history.

## Scheduling Constraint

The portal’s heartbeat framework can create authenticated `/api/scheduled/...` callbacks, but the browser runner must execute in the selected persistent Mac/self-hosted environment because the trusted Edge profile cannot reside in the stateless portal deployment.
