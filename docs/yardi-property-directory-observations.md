# Yardi Property Directory — Read-Only Observation Record

**Source:** Authorized Microsoft Edge session, Yardi Elevate Compliance Manager dashboard property lookup.  
**Observed:** 2026-08-28.  
**Scope:** Read-only inspection of the dashboard’s existing **Property or List** lookup. No property row was selected, no filter was saved or applied, and no report form or report-generation action was opened.

## Initial visible lookup rows

The lookup presented columns for **Property Name**, **Code**, and **Address**. The initial viewport included several entries whose parenthetical naming and blank address values indicate that they may be saved lists or non-property placeholders; they are recorded as unclassified and will not be imported without a reliable property classification.

| Observed label | Code | Address | Classification at observation time |
|---|---:|---|---|
| `(commbill)` | `commbill` | — | Unclassified; exclude pending confirmation |
| `(eliseai)` | `eliseai` | — | Unclassified; exclude pending confirmation |
| `(ginger)` | `ginger` | — | Unclassified; exclude pending confirmation |
| `(marcsgro)` | `marcsgro` | — | Unclassified; exclude pending confirmation |
| `(river)` | `river` | — | Unclassified; exclude pending confirmation |
| `1425 E. Clark Avenue (401)` | `401` | `91-31 Queens Blvd., Elmhurst, NY` | Candidate property; pending complete read-only inventory |
| `1985 MARCUS AVE LLC (756)` | `756` | `91-31 QUEENS BLVD, SUITE 512, ELMHURST, NY` | Candidate property; pending complete read-only inventory |
| `221 East 78th St. Assoc. (400)` | `400` | `221 East 78th Street, New York, NY` | Candidate property; pending complete read-only inventory |

## Import guard

The eventual Yardi property synchronization must submit only the verified candidate property rows, use Yardi’s displayed code as the source-specific external identifier, and remain source-isolated from every OneSite property. A complete result set and exact expected total must be audited before any catalog-style synchronization or deactivation behavior is introduced.

## Scrolling checkpoint

The table’s internal scrollbar moved during a second read-only inspection, but the visible extracted rows did not advance beyond the initial set. This indicates that the current lookup may use virtualized rendering, pagination, or a list-selection state not exposed by the browser text extractor. No additional rows were inferred or imported. The modal remains read-only and no selection, **OK**, **Save**, or filter-application action has been invoked.

## Pagination-removal checkpoint

The provider’s **Remove Pagination** control was selected solely to expand the lookup for read-only review; it changed to **Show Pagination** and did not select a row, apply a filter, or save dashboard state. The rendered table remained viewport-limited, with only the same initial candidates exposed by the browser extractor. A complete inventory therefore requires a dedicated, source-isolated collector that can enumerate the lookup data deterministically. Until that evidence exists, **zero Yardi properties will be synchronized**.

## Session cleanup

The lookup modal was closed without confirming a property. The authorized Microsoft Edge session was then returned to the Compliance Manager Reports overview. No report form was opened, configured, submitted, or generated during this inspection pass.
