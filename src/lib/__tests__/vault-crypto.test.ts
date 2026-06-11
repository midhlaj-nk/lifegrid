import { describe, expect, it } from "vitest";
import {
  deriveKey,
  encrypt,
  decrypt,
  newSalt,
  makeKeyCheck,
  verifyKeyCheck,
  generatePassword,
} from "@/lib/vault-crypto";

// use fewer iterations in tests to stay fast; correctness is iteration-independent
const TEST_ITERS = 1000;

describe("vault crypto", () => {
  it("roundtrips plaintext", async () => {
    const key = await deriveKey("correct horse battery", newSalt(), TEST_ITERS);
    const blob = await encrypt(key, JSON.stringify({ password: "s3cret✓" }));
    expect(JSON.parse(await decrypt(key, blob))).toEqual({ password: "s3cret✓" });
  });

  it("fresh IV per encryption", async () => {
    const key = await deriveKey("pw", newSalt(), TEST_ITERS);
    const a = await encrypt(key, "same");
    const b = await encrypt(key, "same");
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it("wrong password fails key check", async () => {
    const salt = newSalt();
    const good = await deriveKey("right password", salt, TEST_ITERS);
    const check = await makeKeyCheck(good);
    expect(await verifyKeyCheck(good, check)).toBe(true);
    const bad = await deriveKey("wrong password", salt, TEST_ITERS);
    expect(await verifyKeyCheck(bad, check)).toBe(false);
  });

  it("different salt → different key", async () => {
    const k1 = await deriveKey("pw", newSalt(), TEST_ITERS);
    const k2 = await deriveKey("pw", newSalt(), TEST_ITERS);
    const blob = await encrypt(k1, "data");
    await expect(decrypt(k2, blob)).rejects.toThrow();
  });

  it("password generator: length + charset coverage", () => {
    const pw = generatePassword(20);
    expect(pw).toHaveLength(20);
    expect(pw).toMatch(/[A-Z]/);
    expect(pw).toMatch(/[a-z]/);
    expect(pw).toMatch(/[0-9]/);
    expect(pw).toMatch(/[!@#$%^&*\-_=+?]/);
    expect(generatePassword(20)).not.toBe(generatePassword(20));
  });
});
