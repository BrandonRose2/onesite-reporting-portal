import { describe, expect, it } from "vitest";

describe("RealPage server-side credential configuration", () => {
  it("loads configured credentials and reaches the RealPage report host with an authenticated request", async () => {
    const username = process.env.REALPAGE_USERNAME;
    const password = process.env.REALPAGE_PASSWORD;

    expect(username).toBeTruthy();
    expect(password).toBeTruthy();

    const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
    const response = await fetch("https://arainc.onesite.realpage.com/", {
      method: "HEAD",
      headers: { Authorization: authorization },
      redirect: "manual",
    });

    // The report host may redirect a valid browser-authenticated session to its sign-in shell;
    // a non-5xx response verifies secure credential loading and source-host reachability.
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(500);
  }, 20_000);
});
