# Yardi Catalog Synchronization Validation

## Scope

On 2026-08-28, the portal accepted the deterministic, read-only **Yardi Elevate → Voyager 8 → Compliance Manager Reports** catalog through the source-isolated Yardi runner endpoint. The synchronization created catalog metadata only. It did not open a report form, select a report setting, create a Yardi request, or generate a provider report.

## Database verification

| Verification | Result |
| --- | --- |
| Active Yardi catalog records | 138 |
| Active OneSite catalog records after sync | 310 |
| Inactive OneSite records retained for history | 31 |
| Yardi records named `Report Type` | 0 |
| Yardi records with an uninspected format list | 138 |
| Yardi records with `catalogSource: yardi_elevate_voyager_8` and `executionSupport: unconfigured` | 138 |
| Yardi report requests created during synchronization | 0 |

## Category totals

| Report area | Catalogued reports |
| --- | ---: |
| Affordable | 24 |
| 50059 | 37 |
| Tax Credit | 26 |
| Waiting List | 10 |
| Financial Reports | 26 |
| RentCafe | 12 |
| System | 3 |
| **Total** | **138** |

## User-interface verification

The authenticated portal’s Yardi Pull Reports view rendered **138 active reports** at desktop and iPhone-width layouts. The title-only search/picker is populated. Every imported Yardi entry remains in a clear first-use state: the provider session panel is separate, formats are not represented as Excel/PDF/CSV until inspected, and request authorization is disabled unless a report has captured formats and permitted parameter definitions. No Yardi properties were added, and no Yardi report-generation action was exposed by this catalog import.
