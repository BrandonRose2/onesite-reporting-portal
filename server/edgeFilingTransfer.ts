import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { ENV } from "./_core/env";
import { getOneSite60001BrowserUploadPlan } from "./browserBatchFiling";

const TRANSFER_AUDIENCE = "onesite-60001-edge-filing";
const CAPABILITY_TTL_MS = 15 * 60 * 1000;

type CapabilityPayload = {
  aud: typeof TRANSFER_AUDIENCE;
  extensionId: string;
  exp: number;
  issuedAt: number;
  jti: string;
  pendingPropertyNames: string[];
  requestId: 60001;
};

function encode(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(payload: string, secret: string) {
  return encode(createHmac("sha256", secret).update(payload).digest());
}

export function isValidExtensionId(value: string) {
  return /^[a-p]{32}$/.test(value);
}

export function createEdgeFilingCapability(input: { extensionId: string; pendingPropertyNames: string[]; now?: number; secret?: string }) {
  if (!isValidExtensionId(input.extensionId)) throw new Error("The Edge companion identity is invalid.");
  const secret = input.secret ?? ENV.cookieSecret;
  if (!secret) throw new Error("The portal capability signer is unavailable.");
  const issuedAt = input.now ?? Date.now();
  const payload: CapabilityPayload = {
    aud: TRANSFER_AUDIENCE,
    extensionId: input.extensionId,
    exp: issuedAt + CAPABILITY_TTL_MS,
    issuedAt,
    jti: randomBytes(18).toString("base64url"),
    pendingPropertyNames: [...input.pendingPropertyNames],
    requestId: 60001,
  };
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${signature(encoded, secret)}`;
}

export function verifyEdgeFilingCapability(token: string, input: { extensionId: string; now?: number; secret?: string }) {
  const [encoded, receivedSignature, ...extra] = token.split(".");
  const secret = input.secret ?? ENV.cookieSecret;
  if (!encoded || !receivedSignature || extra.length || !secret) throw new Error("The Edge filing capability is invalid.");
  const expectedSignature = signature(encoded, secret);
  const validSignature = receivedSignature.length === expectedSignature.length && timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature));
  if (!validSignature) throw new Error("The Edge filing capability signature is invalid.");
  let payload: CapabilityPayload;
  try { payload = JSON.parse(decode(encoded)); } catch { throw new Error("The Edge filing capability payload is invalid."); }
  if (payload.aud !== TRANSFER_AUDIENCE || payload.requestId !== 60001 || payload.extensionId !== input.extensionId || !Array.isArray(payload.pendingPropertyNames) || payload.exp <= (input.now ?? Date.now())) {
    throw new Error("The Edge filing capability is expired or does not match this companion.");
  }
  return payload;
}

export async function issueOneSite60001EdgeFilingCapability(extensionId: string) {
  const plan = await getOneSite60001BrowserUploadPlan();
  return {
    capability: createEdgeFilingCapability({ extensionId, pendingPropertyNames: plan.pendingFiling }),
    expiresInSeconds: CAPABILITY_TTL_MS / 1000,
    requestId: plan.requestId,
    pendingCount: plan.pendingFiling.length,
  };
}

