/**
 * Provider session registry.
 *
 * Both source sites are reached through a live Microsoft Edge session that the
 * operator has already signed in to. The portal and the macOS runner never hold
 * a OneSite or Yardi password: the only secret in the retrieval path is
 * ONESITE_RUNNER_TOKEN, which authenticates the runner to the portal.
 *
 * This module is the single place that knows, per provider, where the operator
 * signs in, which page proves the session is usable, and how an observed Edge
 * page maps onto a connection status.
 */

export type ProviderKey = "onesite" | "yardi";
export type SourceSystem = "realpage" | "yardi";
export type SessionStatus = "ready" | "unavailable" | "interactive_required";

export type ProviderSession = {
  provider: ProviderKey;
  sourceSystem: SourceSystem;
  label: string;
  /**
   * Row key in `runnerConnectionStatuses`. OneSite keeps the original
   * "macos-live-edge" key so the already-deployed runner keeps reporting
   * without a coordinated release.
   */
  runnerKey: string;
  /** Where the operator signs in by hand, in Edge. */
  signInUrl: string;
  /** The page whose presence proves reports are reachable for this session. */
  reportsUrl: string;
  /** Host fragments that identify a page as belonging to this provider. */
  hostHints: string[];
  /** Title/URL fragments that mean the session is usable. */
  readySignals: string[];
  /** Title/URL fragments that mean a person must act in Edge. */
  interactiveSignals: string[];
};

export const PROVIDER_KEYS: readonly ProviderKey[] = ["onesite", "yardi"] as const;

export const PROVIDER_SESSIONS: Record<ProviderKey, ProviderSession> = {
  onesite: {
    provider: "onesite",
    sourceSystem: "realpage",
    label: "RealPage OneSite",
    runnerKey: "macos-live-edge",
    signInUrl: "https://arainc.onesite.realpage.com/",
    reportsUrl: "https://arainc.onesite.realpage.com/ui/accounts/#/tasks-list/delinquent-prepaid",
    hostHints: ["onesite.realpage.com", "realpage.com"],
    readySignals: ["reports | realpage", "/ui/accounts", "tasks-list", "delinquent-prepaid"],
    interactiveSignals: ["sign in", "signin", "log in", "login", "verify", "verification", "multi-factor", "two-factor", "captcha", "session expired"],
  },
  yardi: {
    provider: "yardi",
    sourceSystem: "yardi",
    label: "Yardi Voyager 8 (Elevate)",
    runnerKey: "macos-live-edge-yardi",
    signInUrl: "https://menowitz35033.yardione.com/",
    reportsUrl: "https://menowitz35033.elevate.cafe/compliancemanagernet/content2/affreportingmenu/AffordableReports",
    hostHints: ["yardione.com", "elevate.cafe"],
    readySignals: ["compliance manager", "affordablereports", "affordable reports", "compliancemanagernet"],
    interactiveSignals: ["sign in", "signin", "log in", "login", "client central", "verify", "verification", "multi-factor", "two-factor", "captcha", "session expired"],
  },
};

export function isProviderKey(value: unknown): value is ProviderKey {
  return typeof value === "string" && (PROVIDER_KEYS as readonly string[]).includes(value);
}

export function isSessionStatus(value: unknown): value is SessionStatus {
  return value === "ready" || value === "unavailable" || value === "interactive_required";
}

/**
 * Resolve a request-supplied provider. Callers that omit it are the existing
 * OneSite runner, so the fallback preserves current behaviour.
 */
export function resolveProvider(value: unknown, fallback: ProviderKey = "onesite"): ProviderSession {
  return PROVIDER_SESSIONS[isProviderKey(value) ? value : fallback];
}

export function providerForSourceSystem(sourceSystem: SourceSystem): ProviderSession {
  return sourceSystem === "yardi" ? PROVIDER_SESSIONS.yardi : PROVIDER_SESSIONS.onesite;
}

/** Accepts "realpage" | "yardi", defaulting to realpage for existing callers. */
export function resolveSourceSystem(value: unknown, fallback: SourceSystem = "realpage"): SourceSystem {
  return value === "yardi" || value === "realpage" ? value : fallback;
}

/**
 * Decide what an observed Edge page means for a provider session.
 *
 * The runner reports the front tab it sees; this keeps the interpretation in
 * one tested place rather than spread through AppleScript. Order matters: an
 * interactive sign-in page frequently also carries the product name, so the
 * sign-in check runs before the ready check.
 */
export function classifySessionSignal(
  provider: ProviderSession,
  observed: { title?: string | null; url?: string | null } | null | undefined,
): { status: SessionStatus; detail: string } {
  const title = (observed?.title ?? "").trim();
  const url = (observed?.url ?? "").trim();
  if (!title && !url) {
    return { status: "unavailable", detail: `No ${provider.label} tab is open in Microsoft Edge.` };
  }

  const haystack = `${title} ${url}`.toLowerCase();
  const onProviderHost = provider.hostHints.some(hint => url.toLowerCase().includes(hint));
  if (!onProviderHost) {
    return {
      status: "unavailable",
      detail: `The open Edge tab is not a ${provider.label} page. Open ${provider.signInUrl} and sign in.`,
    };
  }

  const interactive = provider.interactiveSignals.find(signal => haystack.includes(signal));
  if (interactive) {
    return {
      status: "interactive_required",
      detail: `${provider.label} needs you to finish signing in in Microsoft Edge (saw "${title || url}"). Complete it yourself, then re-check.`,
    };
  }

  const ready = provider.readySignals.some(signal => haystack.includes(signal));
  if (ready) {
    return { status: "ready", detail: title || provider.reportsUrl };
  }

  return {
    status: "unavailable",
    detail: `${provider.label} is open but its reports area was not reached. Navigate to ${provider.reportsUrl}.`,
  };
}
