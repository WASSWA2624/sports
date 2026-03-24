import { describe, expect, it } from "vitest";
import {
  buildUsernameSeed,
  getUserLoginIdentifier,
  normalizeAuthIdentifier,
  normalizePhoneNumber,
} from "../auth-identifiers";

describe("auth identifiers", () => {
  it("normalizes email identifiers to lowercase", () => {
    expect(normalizeAuthIdentifier("USER@Example.COM")).toEqual({
      type: "email",
      normalized: "user@example.com",
      email: "user@example.com",
      phoneNumber: null,
    });
  });

  it("normalizes phone numbers with country code punctuation", () => {
    expect(normalizePhoneNumber("+256 700-123-456")).toBe("+256700123456");
    expect(normalizePhoneNumber("00256 700 123 456")).toBe("+256700123456");
    expect(normalizeAuthIdentifier("+256 (700) 123-456")).toEqual({
      type: "phone",
      normalized: "+256700123456",
      email: null,
      phoneNumber: "+256700123456",
    });
  });

  it("rejects phone numbers that do not include a country code prefix", () => {
    expect(() => normalizeAuthIdentifier("0700123456")).toThrow(
      "Enter a valid email address or phone number with country code."
    );
  });

  it("builds stable username seeds and identifier fallbacks", () => {
    expect(
      buildUsernameSeed(
        { type: "email", email: "Jane.Doe@example.com", phoneNumber: null },
        ""
      )
    ).toBe("jane_doe");

    expect(
      getUserLoginIdentifier({
        email: null,
        phoneNumber: "+256700123456",
        username: "jane_doe",
      })
    ).toBe("+256700123456");

    expect(
      getUserLoginIdentifier({
        email: null,
        phoneNumber: null,
        username: "jane_doe",
      })
    ).toBe("jane_doe");
  });
});
