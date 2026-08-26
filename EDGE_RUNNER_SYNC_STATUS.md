# Edge Runner Catalog Sync Status

## Current state

The manual GitHub Actions workflow **Sync Live Edge OneSite Sources** was dispatched successfully on 2026-08-26 for the recovered private runner repository:

- Repository: `BrandonRose2/realpage-portal-runner`
- Workflow run: `33018257377`
- Run URL: `https://github.com/BrandonRose2/realpage-portal-runner/actions/runs/33018257377`
- Requested scope: `catalog`
- Catalog/report generation: **not started**

The designated self-hosted macOS runner came online and claimed the job. It failed during the safe Microsoft Edge session check, before catalog pagination or portal synchronization.

## Verified blocker

The macOS runner invoked the recovered `check:live-edge-session` command. Its AppleScript could not find an open Edge tab whose URL begins with:

`https://www.realpage.com/reporting/`

The saved runner reports that no RealPage Reports Hub tab is open in the same macOS user session as the self-hosted GitHub runner. The helper has not created, submitted, downloaded, or modified any OneSite report.

## Next safe action

On the management Mac, open the authenticated Classic OneSite / RealPage Reports page in Microsoft Edge, ensuring the page URL resolves under `https://www.realpage.com/reporting/`. Keep that tab open, then re-run the manual workflow with `scope=catalog`. Once the catalog sync succeeds, the runner will discover the paginated report list and post it to the live portal’s isolated OneSite endpoint. Property synchronization is a separate manual workflow scope and requires a visible `Select Property` panel; it never generates a report.
