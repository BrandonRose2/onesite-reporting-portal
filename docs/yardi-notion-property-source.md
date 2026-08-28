# Yardi Property Directory — Notion Source Record

**Authoritative source selected by the user:** [Company Contacts 7.23.26](https://app.notion.com/p/afebeda7e3b54186a6eb9eb20b57048f?pvs=204), specifically the [Managers & Assistants Contact List](https://app.notion.com/p/dbea06080450452e977cf380b120f26b?pvs=204) data source.  
**Designation field:** `⭐ Yardi Properties` checkbox.  
**Collection date:** 2026-08-28.  
**Data discipline:** Query only the rows whose designation equals `__YES__`; retrieve Property, Region, Street Address, City, State, and Zip. Do not synchronize contact details or reuse OneSite identifiers.

## Deduplicated Yardi-designated property labels

The Notion query returned 15 marked rows corresponding to 8 unique property labels. Duplicate contact rows are intentionally collapsed by property label before synchronization.

| Property label | Region | City, State | Notion row count |
|---|---|---|---:|
| Columbia Village (Office) | Region 4 | Sonora, CA | 2 |
| Forest View Senior Apts | Region 4 | Sonora, CA | 1 |
| La Promesa | Region 2 | Odessa, TX | 2 |
| River Garden | Region 4 | Sacramento, CA | 1 |
| River Pointe Apts | Region 4 | Columbus, OH | 2 |
| Ruby Diamond / Star Homes | Region 3 | Harvey, LA | 2 |
| The Gates on Manhattan | Region 3 | Harvey, LA | 4 |
| Thibodaux - Colonial Estates Apts | Region 3 | Thibodaux, LA | 1 |

## Source-isolation and identity rules

This Notion designation is the authoritative Yardi portfolio for the portal. The names must be stored under `source = yardi` with source-specific stable identifiers derived from the Notion designation, not inferred OneSite IDs and not guessed Yardi system codes. The later combined collaborative reporting layer may aggregate source-labelled output, but it must retain these records as independently sourced Yardi properties.
