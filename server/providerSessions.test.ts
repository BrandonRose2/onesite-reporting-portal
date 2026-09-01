import { describe, expect, it } from "vitest";
import {
  PROVIDER_KEYS,
  PROVIDER_SESSIONS,
  classifySessionSignal,
  isProviderKey,
  isSessionStatus,
  providerForSourceSystem,
  resolveProvider,
  resolveSourceSystem,
} from "./providerSessions";

describe("provider session registry", () => {
  it("covers both source sites with distinct runner keys", () => {
    expect(PROVIDER_KEYS).toEqual(["onesite", "yardi"]);
    const keys = PROVIDER_KEYS.map(provider => PROVIDER_SESSIONS[provider].runnerKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps the deployed OneSite runner key unchanged so the live runner keeps reporting", () => {
    expect(PROVIDER_SESSIONS.onesite.runnerKey).toBe("macos-live-edge");
  });

  it("maps each provider onto its own source system", () => {
    expect(PROVIDER_SESSIONS.onesite.sourceSystem).toBe("realpage");
    expect(PROVIDER_SESSIONS.yardi.sourceSystem).toBe("yardi");
    expect(providerForSourceSystem("yardi").provider).toBe("yardi");
    expect(providerForSourceSystem("realpage").provider).toBe("onesite");
  });

  it("defaults an omitted provider to OneSite so existing runner calls keep working", () => {
    expect(resolveProvider(undefined).provider).toBe("onesite");
    expect(resolveProvider("nonsense").provider).toBe("onesite");
    expect(resolveProvider("yardi").provider).toBe("yardi");
    expect(resolveSourceSystem(undefined)).toBe("realpage");
    expect(resolveSourceSystem("yardi")).toBe("yardi");
  });

  it("validates provider and status inputs", () => {
    expect(isProviderKey("yardi")).toBe(true);
    expect(isProviderKey("realpage")).toBe(false);
    expect(isSessionStatus("interactive_required")).toBe(true);
    expect(isSessionStatus("expired")).toBe(false);
  });
});

describe("classifying an observed Microsoft Edge tab", () => {
  const onesite = PROVIDER_SESSIONS.onesite;
  const yardi = PROVIDER_SESSIONS.yardi;

  it("reports unavailable when no tab was observed", () => {
    expect(classifySessionSignal(onesite, null).status).toBe("unavailable");
    expect(classifySessionSignal(onesite, { title: "", url: "" }).status).toBe("unavailable");
  });

  it("reports unavailable when the open tab belongs to something else", () => {
    const result = classifySessionSignal(onesite, { title: "Inbox", url: "https://outlook.office.com/mail/" });
    expect(result.status).toBe("unavailable");
    expect(result.detail).toContain("arainc.onesite.realpage.com");
  });

  it("treats a OneSite sign-in page as needing a person, not as ready", () => {
    const result = classifySessionSignal(onesite, {
      title: "Sign In | OneSite",
      url: "https://arainc.onesite.realpage.com/login",
    });
    expect(result.status).toBe("interactive_required");
  });

  it("treats a multi-factor prompt as needing a person", () => {
    expect(classifySessionSignal(onesite, {
      title: "Multi-Factor Verification",
      url: "https://arainc.onesite.realpage.com/mfa",
    }).status).toBe("interactive_required");
  });

  it("reports ready on the OneSite reports area", () => {
    const result = classifySessionSignal(onesite, {
      title: "Reports | RealPage",
      url: "https://arainc.onesite.realpage.com/ui/accounts/#/tasks-list/delinquent-prepaid",
    });
    expect(result.status).toBe("ready");
    expect(result.detail).toBe("Reports | RealPage");
  });

  it("reports ready on the Yardi Affordable Reports route", () => {
    expect(classifySessionSignal(yardi, {
      title: "Compliance Manager",
      url: "https://menowitz35033.elevate.cafe/compliancemanagernet/content2/affreportingmenu/AffordableReports",
    }).status).toBe("ready");
  });

  it("treats Yardi Client Central as a login page rather than the reports workspace", () => {
    // Client Central is only a login page; the notes call this out explicitly.
    expect(classifySessionSignal(yardi, {
      title: "Client Central",
      url: "https://menowitz35033.yardione.com/clientcentral",
    }).status).toBe("interactive_required");
  });

  it("does not accept a OneSite page as proof of a Yardi session", () => {
    expect(classifySessionSignal(yardi, {
      title: "Reports | RealPage",
      url: "https://arainc.onesite.realpage.com/ui/accounts/",
    }).status).toBe("unavailable");
  });

  it("reports unavailable when signed in but parked away from reports", () => {
    const result = classifySessionSignal(yardi, {
      title: "Maintenance",
      url: "https://menowitz35033.elevate.cafe/maintenancenet/content2/workorders",
    });
    expect(result.status).toBe("unavailable");
    expect(result.detail).toContain("AffordableReports");
  });
});
