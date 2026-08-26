# OneSite and Yardi Runner Security Model

## Security boundary

OneSite and Yardi are **independent runner integrations**. The portal stores report requests, approved catalog metadata, property context, session readiness, and filed-document metadata. It does not store login passwords, browser cookies, MFA codes, CAPTCHA responses, access tokens, or browser-profile files.

| Integration | Portal secret | Runner-local credential store | Portal-visible session state |
|---|---|---|---|
| OneSite | `ONESITE_RUNNER_TOKEN` | Dedicated macOS Keychain item and a dedicated encrypted Edge profile | `ready`, `unavailable`, or `interactive_required` |
| Yardi | `YARDI_RUNNER_TOKEN` | Separate macOS Keychain item and a separate encrypted Edge profile | `ready`, `unavailable`, or `interactive_required` |

The shared runner tokens authenticate the runner to the portal. They are **not** vendor login credentials and must not be reused across OneSite and Yardi.

## macOS runner configuration

Use a dedicated, restricted macOS account for the reporting runner. **OneSite/RealPage synchronization must run only through its mandatory Microsoft Edge profile on that macOS runner.** The runner should retrieve each vendor's username and password from the operating-system keychain at execution time. Avoid `.env` files, source control, shared documents, and portal database records for vendor credentials.

The runner may maintain provider-permitted session continuity through separate Edge profiles, one for OneSite and one for Yardi. The portal's connected browser and other browser engines are not valid substitutes for the mandatory OneSite/RealPage Edge profile. Browser storage remains encrypted and local to that operating-system account. Do not export, upload, copy, or replay cookies through the portal.

## Session continuity and MFA

When supported by the vendor, enable the provider's trusted-device or remember-device option from the authorized browser session. The runner must report `interactive_required` whenever the provider requires CAPTCHA, MFA, a text code, a password reset, or other interactive verification.

> The portal does not bypass, automate around, capture, or store CAPTCHA responses or MFA codes. An authorized operator must complete those challenges in the browser.

## Safe startup sequence

1. Start the dedicated OneSite or Yardi runner under its restricted macOS account.
2. Read the appropriate vendor credentials from the local keychain and the matching portal token from the protected runner configuration.
3. Open the matching dedicated Edge profile and verify the provider session.
4. Report `ready`, `unavailable`, or `interactive_required` to the matching source endpoint.
5. Only when the status is `ready`, synchronize the source-specific catalog or claim a request from the matching queue.

The OneSite runner uses `/api/onesite-runner/*`; the Yardi runner uses `/api/yardi-runner/*`. Both API families reject credential, token, and cookie material in request payloads.
