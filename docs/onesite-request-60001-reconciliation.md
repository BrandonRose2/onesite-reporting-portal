# OneSite Request #60001 — Current-Batch Reconciliation Record

**Request:** `#60001` — All Units (Excel)  
**Authorized scope:** OneSite native Select All; provider-confirmed 35 properties.  
**Provider context:** Microsoft Edge only, OneSite/RealPage **My Reports** page.  
**Inspection date:** 2026-08-28.  
**Provider actions performed:** Read-only inspection of the existing My Reports grid. No Generate page or control was opened, no report was rerun, and no settings were changed.

## First-page provider evidence

The rendered My Reports grid was set to 10 entries per page and showed `1–10 of 2339`. Its current first page contained the following 08/28/2026 11:04 AM All Units (Excel) rows.

| Property | Format | Provider status | Completed timestamp |
|---|---|---|---|
| 135th Street Apartments | Excel | Completed | 08/28/2026 11:04 AM |
| Anaheim Gardens | Excel | Completed | 08/28/2026 11:04 AM |
| Arbor Crest | Excel | Completed | 08/28/2026 11:04 AM |
| Bayou Pointe | Excel | Completed | 08/28/2026 11:04 AM |
| Boca Ciega Townhomes | Excel | Completed | 08/28/2026 11:04 AM |
| Breckenridge Village | Excel | Completed | 08/28/2026 11:04 AM |
| Coral Village | Excel | Completed | 08/28/2026 11:04 AM |
| Crossroads of Lees Summit | Excel | Completed | 08/28/2026 11:04 AM |
| Cumberland Apartments | Excel | In Progress | — |
| Fairfax Sr Apartments | Excel | Completed | 08/28/2026 11:04 AM |

## Reconciliation guard

The filer must retain the **10 original/HTML pairs already stored for Request #60001**, must not produce a duplicate document pair, and must never mark the request complete until a fresh provider inventory confirms its completed count and identifies any non-completed provider rows. Cumberland remains a provider-side exception at this checkpoint; no output will be inferred or filed for it.

## Pagination-control checkpoint

The native My Reports page footer exposes a page-size selector with 10, 20, 30, 40, and 50 entries and a page-number input with previous/next controls. A read-only click located the selector but did not alter its active value: the provider still displayed `1–10 of 2339`. No provider row was opened, no download control was activated, and no report-generation control was accessed.

## Expanded current-batch inventory

The page-size control was then changed within the existing My Reports grid to its 50-entry view. The 35 contiguous 08/28/2026 11:04 AM **All Units (Excel)** rows are completely visible before historical 08/27 entries begin. Their current provider status is summarized below.

| Provider outcome | Count | Properties requiring special handling |
|---|---:|---|
| Completed | 31 | Eligible for exact-name reconciliation against the ten filed pairs before any existing-file download |
| In Progress | 2 | Cumberland Apartments; Urban Rehab |
| Errored | 2 | Granite Elmwood Indiana Homes; Granite Valencia Villas |

The 31 completed records are the only candidates for the idempotent filer. The two in-progress and two errored records are preserved as provider exceptions; they must not be retried, fabricated, or treated as filed until a future read-only status check shows a completed provider output.

## Filed-pair reconciliation

The portal already contains **20 Request #60001 documents**, comprising one preserved original and one responsive HTML companion for each of the following 10 completed properties: 135th Street Apartments, Anaheim Gardens, Arbor Crest, Bayou Pointe, Boca Ciega Townhomes, Breckenridge Village, Coral Village, Crossroads of Lees Summit, Fairfax Sr Apartments, and Grace Townhomes.

Accordingly, the remaining current-batch reconciliation scope is **21 completed provider rows**. The two in-progress and two errored rows remain excluded. The reconciler must resolve provider names exactly, skip the ten completed properties listed above, and keep Request #60001 open until those 21 existing outputs have been downloaded, parsed, and filed successfully.

## Existing-result action boundary

Opening the action menu for one completed All Units row exposed four existing-result actions: **Download**, **View Parameters**, **History**, and **File Documents**. The menu is on the My Reports result itself, not a report-generation screen. The reconciliation path may use only **Download** for a completed row after confirming it is missing from Request #60001’s filed-pair inventory. It must never use **View Parameters** to change settings, **File Documents** for an unverified target, or any Generate control.

## Reload behavior

Returning to the My Reports route resets its page size to 10 entries. The reconciliation procedure must therefore explicitly set the built-in view to 50 entries and confirm the `1–50 of 2339` grid signature before it inventories or acts on any current-batch result. This avoids the prior first-page-only staging failure while still restricting activity to existing My Reports outputs.

## Browser-only execution boundary

On 2026-08-28, the user retired the macOS/Terminal runner path. The queued self-hosted workflow was cancelled before it began. The connected Microsoft Edge browser is now the sole provider context for any future Request #60001 inspection or existing-result download; it remains authenticated on My Reports and no Generate control has been accessed.

The browser-only control pass located and focused the My Reports page-size selector, which still displayed 10 entries after the route reload. No report row, download, parameter, history, file-document, or report-generation action was activated during that pass.

The connected Edge session then set the existing My Reports grid to its 50-entry view and verified `1–50 of 2339`. The visible 08/28 All Units current batch again reconciled to **35** outcomes: **31 completed**, **2 in progress**, and **2 errored**. This matches the recorded OneSite-native Select All count, so only the 21 completed-but-unfiled outputs remain eligible for browser-only download and filing.

The first browser-only candidate selected for controlled action-menu inspection is **Granite Ridge Apartments**. Its row is completed at 08/28/2026 11:04 AM and it has no Request #60001 document pair. The following **Granite Valencia Villas** row is provider-errored and is excluded from download consideration.

The existing-result **Download** action for Granite Ridge Apartments was invoked once in the connected Microsoft Edge My Reports grid. This was a retrieval of the already-generated workbook, not a new report run. The browser action did not return an accessible workbook path in the portal environment, so Granite Ridge has **not** been recorded as filed and no duplicate or placeholder document was created. File handoff must be confirmed before the next reconciliation action.

The connected Edge download manager is not available to the portal sandbox, and no corresponding workbook appeared in the sandbox download directory. Further provider downloads are paused so the same result is not retrieved repeatedly without an accessible file handoff. The approved batch remains intact, Request #60001 remains in progress, and Granite Ridge remains unfiled until a browser-to-portal file-transfer path is available.
