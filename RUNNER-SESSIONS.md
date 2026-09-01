# Source site sessions: OneSite and Yardi

How the portal reaches the two report sites, and where every secret lives.

## The rule

**No OneSite or Yardi password is stored anywhere in this system** — not in the
repo, not in the database, not in the portal environment, not on the runner.

Both sites are reached through a Microsoft Edge session that *you* signed in to.
The runner drives that live session. It cannot sign in on your behalf and it is
not supposed to be able to.

This is deliberate. Both sites enforce multi-factor verification, and a stored
service password would break at the first MFA prompt, the first password
rotation, and the first login redesign — silently, at 7:00 AM on a Monday.

## The only secret in the retrieval path

| Secret | Lives in | Purpose |
|---|---|---|
| `ONESITE_RUNNER_TOKEN` | Portal environment **and** the Mac runner's keychain | Authenticates the Mac runner to the portal. Nothing else. |

It is compared in constant time (`timingSafeEqual`) and sent as the
`x-onesite-runner-token` header. It grants every runner endpoint, including
document upload — treat it as a full-access credential for the reporting data.

### Storing it on the Mac runner

Put it in the login keychain, not in a shell profile or a `.env` committed
anywhere:

```bash
security add-generic-password -a "$USER" -s onesite-runner-token -w
```

That prompts for the value and stores it without it appearing in your shell
history. The runner reads it back with:

```bash
security find-generic-password -a "$USER" -s onesite-runner-token -w
```

### Rotating it

1. Generate a new value: `openssl rand -hex 32`
2. Set it in the portal environment and redeploy.
3. Update the keychain entry on the runner (`security add-generic-password -U …`).
4. Confirm with a health check:
   `curl -fsS -H "x-onesite-runner-token: $TOKEN" "$PORTAL/api/onesite-runner/health"`

Rotate whenever someone with runner access leaves, or if the value is ever
pasted into a chat, a ticket, or a log.

## Signing in to each site

You do this by hand, in Edge, on the runner Mac.

| | RealPage OneSite | Yardi Voyager 8 |
|---|---|---|
| Sign in at | `https://arainc.onesite.realpage.com/` | `https://menowitz35033.yardione.com/` |
| Then reach | `…/ui/accounts/#/tasks-list/delinquent-prepaid` | `…elevate.cafe/compliancemanagernet/…/AffordableReports` |
| Applies to | 33 OneSite properties | the 8 Yardi properties |
| Runner key | `macos-live-edge` | `macos-live-edge-yardi` |

Yardi note: the **Client Central** tab is only a login page. It is not the
reports workspace, and the portal classifies it as "sign-in needed" rather than
ready — landing there does not mean you are signed in for reporting.

## How the portal knows a session is usable

The runner reports the Edge tab it observes; the portal decides what that means.
Either post a status directly, or post the observation and let the portal
classify it (preferred — the logic is in one tested place, `providerSessions.ts`):

```bash
curl -fsS -X POST "$PORTAL/api/onesite-runner/live-edge-status" \
  -H "x-onesite-runner-token: $TOKEN" \
  -H "content-type: application/json" \
  -d '{"provider":"yardi","observed":{"title":"Compliance Manager","url":"https://menowitz35033.elevate.cafe/compliancemanagernet/content2/affreportingmenu/AffordableReports"}}'
```

Statuses:

- **ready** — the reports area is reachable; requests may run.
- **interactive_required** — a sign-in, MFA, or CAPTCHA page is showing. Finish
  it yourself in Edge. The runner will not attempt it.
- **unavailable** — no provider tab is open, or the tab is signed in but parked
  away from reports.

Omitting `provider` defaults to OneSite, so the already-deployed runner keeps
working without a coordinated release.

## Queueing a Yardi run

Yardi requests are claimed with `sourceSystem: "yardi"`:

```bash
curl -fsS -X POST "$PORTAL/api/onesite-runner/requests/claim" \
  -H "x-onesite-runner-token: $TOKEN" \
  -H "content-type: application/json" \
  -d '{"sourceSystem":"yardi"}'
```

A Yardi claim only ever returns properties mapped to Yardi in `propertySources`.
If none are mapped it fails the request with a clear message rather than running
the whole portfolio through the wrong site. **Map the 8 Yardi properties in
`propertySources` before the first Yardi run**, or every Yardi request will fail
by design.

Filed Yardi documents are stored under `yardi-reports/…`, separate from
`onesite-reports/…`.

## What this replaces

`realpage-credentials.test.ts` and `yardiCredentials.test.ts` were removed.

The RealPage one sent HTTP Basic auth to a host that uses a form login and
asserted the response status was between 200 and 499. A sign-in redirect is 302,
so it passed with wrong, expired, or absent credentials. It read as credential
verification and verified nothing, and it transmitted a real password to an
endpoint that could only discard it.

Under the session model there are no OneSite or Yardi credentials to test.
Session health is proven by the live-edge status check above.

## Open item

`todo.md` carries "Store verified Yardi credentials as protected runner secrets
for future unattended report pulls." That conflicts with this model and should
be closed as won't-do unless you move to vendor APIs (RealPage Exchange, Yardi
Voyager Web Services), which is the supported route to unattended runs.
