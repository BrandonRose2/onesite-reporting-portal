import express from "express";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { registerRunnerRoutes } from "./runnerRoutes";

const activeServers: Array<ReturnType<typeof express>["listen"]> = [];

afterEach(async () => {
  await Promise.all(activeServers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))));
});

async function startHealthApp() {
  const app = express();
  app.use(express.json());
  registerRunnerRoutes(app);
  const server = app.listen(0);
  activeServers.push(server);
  await new Promise<void>(resolve => server.once("listening", () => resolve()));
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

describe("runner token protection", () => {
  it("accepts the configured runner token on the lightweight health endpoint", async () => {
    const token = process.env.ONESITE_RUNNER_TOKEN;
    expect(token, "ONESITE_RUNNER_TOKEN must be configured for runner integration").toBeTruthy();
    const baseUrl = await startHealthApp();
    const response = await fetch(`${baseUrl}/api/onesite-runner/health`, {
      headers: { "x-onesite-runner-token": token! },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok", service: "onesite-reporting-hub" });
  });

  it("rejects a missing runner token", async () => {
    const baseUrl = await startHealthApp();
    const response = await fetch(`${baseUrl}/api/onesite-runner/health`);
    expect(response.status).toBe(401);
  });

  it("rejects an invalid live Edge status before it can reach operational state", async () => {
    const baseUrl = await startHealthApp();
    const response = await fetch(`${baseUrl}/api/onesite-runner/live-edge-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-onesite-runner-token": process.env.ONESITE_RUNNER_TOKEN! },
      body: JSON.stringify({ status: "not-a-real-state" }),
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "Invalid live Edge status." });
  });
});
