import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";

let server: Server;
let baseUrl = "";

beforeAll(async () => {
  server = createServer((request, response) => {
    const expected = `Basic ${Buffer.from(`${process.env.YARDI_USERNAME}:${process.env.YARDI_PASSWORD}`).toString("base64")}`;
    response.writeHead(request.headers.authorization === expected ? 204 : 401);
    response.end();
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Yardi credential test server did not start.");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

describe("protected Yardi credentials", () => {
  it("authenticates a lightweight runner validation request without exposing credential values", async () => {
    expect(process.env.YARDI_USERNAME).toBeTruthy();
    expect(process.env.YARDI_PASSWORD).toBeTruthy();

    const authorization = `Basic ${Buffer.from(`${process.env.YARDI_USERNAME}:${process.env.YARDI_PASSWORD}`).toString("base64")}`;
    const response = await fetch(`${baseUrl}/runner-credential-check`, {
      headers: { authorization },
    });

    expect(response.status).toBe(204);
  });
});
