# Source Retrieval Workflow Notes

## Source Site 1 — OneSite / RealPage

- The connected BrandonEdge browser opens the OneSite shell at the provided property-context URL.
- The initial observed state identifies property context **221354** and displays a loading placeholder; the report-navigation and export controls have not yet rendered.
- No report filters, report output, or download action has been performed. The next observation should begin once the shell finishes loading or the user navigates to the demonstrated report area.

The OneSite shell continued to display the loading placeholder after a refresh. The menu control could not be activated because the page changed between observations. The report workflow therefore still needs the user to complete the application navigation or expose the report page before its reusable export steps can be captured.

## RealPage Report Route

The representative workflow has reached the OneSite **Delinquent and Prepaid — Accounts** report at `https://arainc.onesite.realpage.com/ui/accounts/#/tasks-list/delinquent-prepaid`.

- The report uses its built-in defaults; no separate Filters configuration is required.
- A representative Anaheim Gardens export was generated as `delinquentprepaidview- (4).csv` and archived in the portal with its source-file metadata.
- Edge records the download as a browser `blob:` URL. Before a server-side scheduled job can retrieve reports autonomously, the underlying authenticated RealPage report/download request must be captured or confirmed through RealPage-supported API/export documentation; browser blob URLs are not server-retrievable.
