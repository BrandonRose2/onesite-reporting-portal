# macOS Runner Reconnection Guide

## Purpose

This portal exposes the runner-facing contract preserved in `realpage-portal-runner`. The portal stores request state, metadata, status events, and document metadata. The macOS runner retains responsibility for the authenticated Microsoft Edge/RealPage session and must continue to keep its credentials, browser profile, and runner token outside this repository.

## Secure configuration boundary

| Location | Store here | Never store here |
|---|---|---|
| Portal deployment secret manager | `ONESITE_RUNNER_TOKEN` | RealPage username/password, Edge profile, browser cookies |
| Runner-local restricted environment file | `PORTAL_BASE_URL`, the matching `ONESITE_RUNNER_TOKEN`, RealPage credentials, and the Edge profile path | Source-control files, shared documents, browser-accessible settings |
| Portal database | Request, property, report-catalog, status, and document metadata | Any credential, access token, browser cookie, or session material |

## Compatible API surface

The recovered portal supports the following runner endpoints. Every endpoint requires the `x-onesite-runner-token` header.

| Endpoint | Role |
|---|---|
| `GET /api/onesite-runner/health` | Confirms that the portal accepts the configured runner token. |
| `POST /api/onesite-runner/live-edge-status` | Publishes `ready`, `unavailable`, or `interactive_required` with an optional safe status detail. |
| `POST /api/onesite-runner/catalog/sync` | Synchronizes verified report-catalog entries. |
| `POST /api/onesite-runner/property-contacts/sync` | Synchronizes safe manager/contact metadata for existing properties. |
| `POST /api/onesite-runner/requests/claim` | Atomically claims the next queued request. |
| `POST /api/onesite-runner/requests/:id/progress` | Records a runner progress reference after a request is claimed. |
| `POST /api/onesite-runner/requests/:id/documents` | Accepts a base64-encoded report file, stores it in managed object storage, and records only its metadata in the database. |
| `POST /api/onesite-runner/requests/:id/complete` | Finalizes a request as completed, completed with warnings, or failed. |

## Staged validation plan

1. **Set the portal URL and token.** Update the runner’s local restricted environment file to point `PORTAL_BASE_URL` at this rebuilt portal and set the matching `ONESITE_RUNNER_TOKEN`. Do not commit that file.
2. **Verify portal reachability.** Run the runner’s health check against the portal. The portal must return a successful response before any work is claimed.
3. **Verify the interactive Edge session.** Use the runner’s visible Edge session check. If RealPage requires multi-factor authentication, complete it in the operator-controlled browser window; do not attempt to automate around it.
4. **Synchronize non-sensitive metadata.** After the session is verified, run the report-catalog and property-contact synchronization steps. Confirm the resulting directory and catalog in the portal.
5. **Run one controlled request.** Use an approved report and one property or a small non-production-equivalent scope. Confirm the lifecycle in the portal: queued → claimed → in progress → completed or completed with warnings.
6. **Verify filed output.** Confirm the file appears in the request and property document library, downloads successfully, and has the correct filename/property association.
7. **Enable scheduled operation only after the controlled result is verified.** Preserve the explicit My Reports limitation. Its request path should continue to complete with a warning until its discovery and download behavior has been independently verified.

## Operational note

The runner API rejects missing or incorrect runner tokens. It also prevents terminal requests from being overwritten by later runner updates, preserving a clear audit trail for operational review.
