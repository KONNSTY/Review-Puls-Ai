import { afterEach, describe, expect, it } from "vitest";
import {
  isEncryptionKeyConfigured,
  openToken,
  sealToken,
} from "./secrets.server";

const original = process.env.TOKEN_ENCRYPTION_KEY;

afterEach(() => {
  if (original === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
  else process.env.TOKEN_ENCRYPTION_KEY = original;
});

describe("token envelope", () => {
  it("round-trips only when a key is configured", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(isEncryptionKeyConfigured()).toBe(false);
    expect(sealToken("shpat_example")).toBe("shpat_example");

    process.env.TOKEN_ENCRYPTION_KEY = "ab".repeat(32);
    expect(isEncryptionKeyConfigured()).toBe(true);
    const sealed = sealToken("shpat_example");
    expect(sealed).not.toBe("shpat_example");
    expect(sealToken(sealed)).toBe(sealed);
    expect(openToken(sealed)).toBe("shpat_example");
    expect(openToken("shpat_plain")).toBe("shpat_plain");
  });
});
