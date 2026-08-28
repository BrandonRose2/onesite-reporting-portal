# OneSite Request Setup and Authorization Contract

## Purpose

The portal separates **configuring a report** from **authorizing a provider submission**. A user may choose a report, property scope, output format, and supported settings in the portal. The provider submission occurs only from the authorized Microsoft Edge session on the designated Mac.

## One-Time Setup

The first time a user selects a report that has no captured parameter model, the portal labels the report as requiring setup. The authorized Mac operator performs a read-only inspection of the OneSite form. The resulting control definitions and provider defaults are stored only under that report's source and catalog identity.

Saved run defaults are user-scoped and keyed by **source + catalog entry + portal user**. OneSite and Yardi defaults never share a record. Later selections preload the saved values, but users can change any provider-permitted value before authorization.

## Authorization Gate

The portal's final confirmation dialog summarizes the exact source, report title, output format, property scope, and settings. Its explicit **Request & Run in OneSite** action creates a request with an execution-authorization timestamp and operator identity. The local runner may claim only requests carrying that authorization.

Requests created by legacy queue controls, including existing pending records, have no authorization and remain non-runnable. This prevents a background runner from submitting a provider report based solely on the existence of a queued record.

## Local Edge Handoff

The Mac runner is a local process. It applies the portal-approved settings in the authenticated Edge Reports page, verifies the requested property scope before Generate, records progress, and files source originals before optional HTML processing. The portal never stores provider credentials, browser cookies, MFA codes, or session data.

The runner cannot wake a Mac, open an Edge login, bypass a provider checkpoint, or submit a request that was not explicitly authorized in the portal. If the local service is not running or Edge is not ready, the portal retains the authorized request and displays its pending local-runner state.

## Report History Safeguards

Report-history records will support safe metadata editing. Deletion will require a deliberate double-click confirmation and write an audit event. Original provider-file removal is a separate, explicitly confirmed operation because it affects the audit source.
