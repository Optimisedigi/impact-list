import { describe, expect, it, beforeAll } from "vitest";
import { randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret } from "../crypto";

beforeAll(() => {
  process.env.CALENDAR_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("crypto", () => {
  it("round-trips an arbitrary secret", () => {
    const plain = "refresh-token-1234567890";
    const ct = encryptSecret(plain);
    expect(ct.startsWith("v1:")).toBe(true);
    expect(decryptSecret(ct)).toBe(plain);
  });

  it("produces a different ciphertext for the same input (random IV)", () => {
    const a = encryptSecret("same");
    const b = encryptSecret("same");
    expect(a).not.toBe(b);
  });

  it("throws on tampered ciphertext", () => {
    const ct = encryptSecret("hello");
    const parts = ct.split(":");
    parts[3] = Buffer.from("tampered").toString("base64");
    expect(() => decryptSecret(parts.join(":"))).toThrow();
  });
});
