# Source Synchronization Notes

## OneSite access checkpoint

On August 26, 2026, the OneSite workspace was opened in a connected browser session that was **not** the mandatory macOS Microsoft Edge runner profile. The shell remained at the provider's `Please wait ...` state. No property directory or report catalog data was extracted and no changes were submitted.

The connected Microsoft Edge session is authenticated to the OneSite production shell and exposes provider navigation such as Administration and Setup, although the main workspace remains at `Please wait ...`. No catalog or directory export has been started. The portal will use source-specific synchronization only after the Edge runner profile reaches the relevant catalog or property view and reports an authorized `ready` session. No credentials, cookies, MFA codes, or browser session data were captured in this note.

## Prior OneSite-only portal reference

The prior OneSite portal confirms a proven OneSite workflow that should be carried forward into the multi-source hub:

- It maintains an approved OneSite catalog, with the prior portal displaying 45 report titles.
- It queues a source-specific report request with report title, all-property or selected-property scope, export format, generation timing, delivery choices, and report-specific parameters.
- It surfaces Edge readiness before reports are queued and keeps a separate My Reports retrieval workflow for runner-filed source documents.
- It associates report runs and filed workbooks with mapped properties and retains request status, output format, document count, and file metadata.

The prior page is a behavioral reference only. No report files, contact records, or credential material were copied from it.

## Authoritative Classic OneSite catalog

The authenticated Classic OneSite **Reports** tab is the authoritative OneSite report catalog for the portal selector. It contains **310 reports across 10 pages**. The catalog will be captured only through the connected Microsoft Edge session and synchronized under the `onesite` source; it must remain separate from all Yardi catalog records.
