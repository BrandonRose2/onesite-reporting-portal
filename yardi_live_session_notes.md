# Yardi Live Session Findings

## Verified 2026-08-18

- The authenticated YardiOne dashboard is available in Microsoft Edge at `menowitz35033.yardione.com`.
- The report-capable application shown on the dashboard is **Elevate – Voyager 8 (Production)**.
- Other visible applications are Aspire for Voyager 8, Client Central, RentCafe Site Manager, and Voyager 7S.
- The Client Central tab is only a login page; it is not the report navigation target.
- The next read-only walkthrough should begin from **Elevate – Voyager 8 (Production)** and identify its reports menu, property-selection behavior, export controls, and download completion behavior.

## Voyager Workspace Navigation

The live Elevate Voyager 8 workspace loads as **Compliance Manager** at `https://menowitz35033.elevate.cafe/compliancemanagernet/content2/dashboard`. Its primary navigation bar exposes **Prospects**, **Residents**, **Accounting**, **Maintenance**, **Reports**, and **More**. The next safe observation point is the **Reports** menu; no report should be selected, generated, or downloaded until the available report categories and export controls have been documented.

## Reports Route

Selecting **Reports** navigated the active Yardi workspace to the Affordable Reports route at `https://menowitz35033.elevate.cafe/compliancemanagernet/content2/affreportingmenu/AffordableReports`. The report content was obscured by an overlapping local window in the capture, so the next observation must expose the browser content and document the available report rows before any report is selected.

## 50059 Category: Visible Inventory

The visible **50059 Reports** list includes 50059 Certifications with Extenuating Circumstances, 50059 Current Income Category, 50059 MI PrePack, 50059 Statistics, 50059s Without Owner Signature, Affordable Voucher Unit Count Report, Birthday Report, Certification Review, EI Cover Page, Ethnicity and Racial Data Form, HAP Voucher 202D, HUD Repayment Agreement Balance, Print 50059 202D, RAD Conversion Details, Rent Override Details, Repayment Agreement Detail, Sec-8 Income Targeting, Special Claim Candidate, Special Claim Status, TRACS Voucher 202D, Unit Activity, Unit Transfer, Voucher Preparation Report, and Voucher Variance Report.

The complete **50059 Audit Reports** entries are Abated Unit Report, Contract Mismatch, Mailing Address Verification, Move In Date Mismatch, Move Out Date Mismatch, Repayment Agreement Discrepancy, Unsubmitted 50059, Voucher Audit Report, and Voucher History Report. The category also includes **50059 Receivable Reports**: Receivable Summary By Account, Receivable Summary by Tenant, Receivable Summary by Tenant Charge, and Tenant Payables and URP Recovery Charges.

## Tax Credit Category: Visible Inventory

The visible **Tax Credit Reports** are Average Income Unit Groupings, Max Rent Audit, Max Rent Overridden Units, Print NCSHA TIC, Tax Credit Birthday Report, Tax Credit Ethnicity and Racial Data Form, Unit Max Rent Report, Unit Qualification Report, and UVR Log.

The visible **State Reports** are Audit NAHMA Fields, Emphasys XML Interface, HUD Tenant Data Collection XML, NAHMA XML Interface Version 5.0, NAHMA XML Interface Version 6.0, NAHMA XML Interface Version 7.0, NAHMA XML Interface Version 8.0, PORT XML, State PSR Report, Tenant Data Collection, WBARS XML Interface, and WBARS XML Interface Version 3.0.

The complete **New York Tax Credit Reports** list is NY Tax Credit and HOME Rent Roll Report (YSR), NYC HPD Special Rent Roll (YSR), NYC HDC Rent Roll (YSR), NYC HDC Rent Roll Collection (YSR), and NYC HDC OAL and Collection Loss Projection Report (YSR).

## Waiting List Category: Complete Inventory

The **Affordable Waiting List** category contains Application Rejection Notice, Post Cards, RD Waiting List Letters, Waiting List, Waiting List Demographics, Waiting List History, Waiting List History Demographics, Waiting List Labels, Waiting List Letters, and Waiting List Rejection.

## Financial Reports Category

The **Financial Reports** route was opened and allowed to load for ten seconds. It remained empty, with no report rows or category entries visible for the current authenticated user. The Pull Reports – Yardi catalog should record this category as visible but currently empty rather than inventing report titles.

## RentCafe Category: Complete Inventory

The visible **RentCafe Reports** are Application Status, Application Status Changes, Applications Per Property, Device Usage Report, Employment Sources, Mailing Labels, Property Screening Activity, Property Workflow Settings, Rent Increase Request Details, Unpublished Units, Verification Method Tracking, and Reasonable Accommodation.

## Custom Reports Category

The **Custom Reports** page exposes a report-name and file-name table with no rows for the current authenticated Yardi account. The Pull Reports – Yardi catalog should record Custom Reports as visible but currently empty.

## Custom Correspondence Category

The **Custom Correspondence** page exposes a report-name table with no rows for the current authenticated Yardi account. The Pull Reports – Yardi catalog should record Custom Correspondence as visible but currently empty.

## System Category: Complete Inventory

The **System Reports** category contains Attachments Review and Elevate Usage.

## Affordable Category: Complete Inventory

The **Affordable Reports** entries are Adobe Merge Letters, Affordable Active Property Unit Count, Affordable GPR Report, Affordable Rent Roll, Affordable Rent Roll With Lease Charges, Affordable Resident Ledger, Affordable Tenant Demographics, Affordable Unit Directory, Affordable Unit Vacancy, Assets greater than Net Asset Limit, Certification Count, Certification Listing, Database Snapshot Report, Income Limit History by Property, Affordable Program Options Associated with Locked Certifications, Properties by Income Limit, Scheduled Annual Recertification, Unit Mapping, Utility Reimbursement, and Missing Resident Email Address Report.

The related **Receivable Reports** are Receivable Aging Detail, Receivable Aging Summary, and Tenant Delinquency. The **Affordable Ad hoc Reports** category contains Ad hoc Report.

## Sidebar Inventory Status

The requested Yardi sidebar categories have been observed: Affordable, 50059, Tax Credit, Waiting List, Financial Reports, RentCafe, Custom Reports, Custom Correspondence, and System. Affordable itself was observed at its initial top position; its visible report inventory will be consolidated with the other captured categories during catalog normalization. Financial Reports, Custom Reports, and Custom Correspondence were visible but empty for this account.
