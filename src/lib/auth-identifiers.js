import { z } from "zod";

const emailSchema = z.string().email();
const PHONE_E164_REGEX = /^\+[1-9]\d{7,14}$/;

function collapseUnderscores(value) {
  return value.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

export function normalizePhoneNumber(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return null;
  }

  const withCountryCode = trimmed.startsWith("00") ? `+${trimmed.slice(2)}` : trimmed;
  if (!withCountryCode.startsWith("+")) {
    return null;
  }

  const normalized = `+${withCountryCode.slice(1).replace(/[^\d]/g, "")}`;
  return PHONE_E164_REGEX.test(normalized) ? normalized : null;
}

export function normalizeAuthIdentifier(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    throw new Error("Enter an email address or phone number with country code.");
  }

  const normalizedEmail = raw.toLowerCase();
  if (emailSchema.safeParse(normalizedEmail).success) {
    return {
      type: "email",
      normalized: normalizedEmail,
      email: normalizedEmail,
      phoneNumber: null,
    };
  }

  const phoneNumber = normalizePhoneNumber(raw);
  if (phoneNumber) {
    return {
      type: "phone",
      normalized: phoneNumber,
      email: null,
      phoneNumber,
    };
  }

  throw new Error("Enter a valid email address or phone number with country code.");
}

export function getUserLoginIdentifier(user) {
  return user?.email || user?.phoneNumber || user?.username || null;
}

export function buildUsernameSeed(identifier, displayName) {
  const source =
    String(displayName || "").trim() ||
    (identifier?.type === "email"
      ? String(identifier.email || "").split("@")[0]
      : String(identifier?.phoneNumber || "").replace(/[^\d]/g, ""));

  const normalized = collapseUnderscores(
    source.toLowerCase().replace(/[^a-z0-9_]+/g, "_")
  );

  if (normalized.length >= 3) {
    return normalized.slice(0, 24);
  }

  const phoneSuffix =
    identifier?.type === "phone"
      ? String(identifier.phoneNumber || "").replace(/[^\d]/g, "").slice(-8)
      : "";

  return collapseUnderscores(`user_${phoneSuffix || "account"}`).slice(0, 24);
}
