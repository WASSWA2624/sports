import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "./db";
import {
  createOpaqueToken,
  hashPassword,
  sha256,
  signPayload,
  verifyPassword,
} from "./security";
import { logAuditEvent } from "./audit";
import {
  buildUsernameSeed,
  getUserLoginIdentifier,
  normalizeAuthIdentifier,
} from "./auth-identifiers";

const SESSION_COOKIE = "sports_session";
const STEP_UP_COOKIE = "sports_step_up";
const ACCESS_COOKIE = "sports_access";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const STEP_UP_TTL_MS = 1000 * 60 * 10;

const authSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  password: z.string().min(8).max(128),
});

const optionalUsernameSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}, z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/).optional());

const optionalDisplayNameSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}, z.string().min(2).max(80).optional());

const signUpSchema = authSchema.extend({
  username: optionalUsernameSchema,
  displayName: optionalDisplayNameSchema,
});

const stepUpSchema = z.object({
  password: z.string().min(8).max(128),
  purpose: z.enum(["profile-security", "admin"]),
});

function getAuthSecret() {
  return process.env.AUTH_SECRET || "local-dev-secret";
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getAccessCookieName() {
  return ACCESS_COOKIE;
}

function getAccessTokenPayload(input = {}) {
  const roles = Array.isArray(input.roles)
    ? input.roles
    : Array.isArray(input.user?.roles)
      ? input.user.roles.map((entry) => entry?.role?.name || entry?.name).filter(Boolean)
      : [];

  return {
    userId: input.user?.id || input.userId || null,
    roles: [...new Set(roles.map((role) => String(role || "").toUpperCase()).filter(Boolean))],
    exp: Date.now() + SESSION_TTL_MS,
  };
}

function createSignedCookieToken(payload) {
  const body = JSON.stringify(payload);
  return `${Buffer.from(body).toString("base64url")}.${signPayload(body, getAuthSecret())}`;
}

function getSubmittedIdentifier(input) {
  const identifier = String(input?.identifier || input?.email || "").trim();
  if (!identifier) {
    throw new Error("Enter an email address or phone number with country code.");
  }

  return identifier;
}

async function isUsernameAvailable(username) {
  const existing = await db.user.findUnique({
    where: { username },
    select: { id: true },
  });

  return !existing;
}

async function resolveUsername(requestedUsername, identifier, displayName) {
  if (requestedUsername) {
    if (!(await isUsernameAvailable(requestedUsername))) {
      throw new Error("A user with this username already exists.");
    }

    return requestedUsername;
  }

  const bases = [
    buildUsernameSeed(identifier, displayName),
    `user_${Date.now().toString(36)}`,
  ];

  for (const base of bases) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const suffix = attempt === 0 ? "" : `_${attempt + 1}`;
      const candidate = `${base.slice(0, 24 - suffix.length)}${suffix}`;

      if (await isUsernameAvailable(candidate)) {
        return candidate;
      }
    }
  }

  throw new Error("Could not allocate a username for this account.");
}

export function writeAccessCookie(response, input) {
  const payload = getAccessTokenPayload(input);

  if (!payload.userId) {
    return response;
  }

  response.cookies.set(ACCESS_COOKIE, createSignedCookieToken(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return response;
}

export function toSessionUserPayload(userContext) {
  if (!userContext?.user) {
    return null;
  }

  return {
    id: userContext.user.id,
    email: userContext.user.email,
    phoneNumber: userContext.user.phoneNumber,
    loginIdentifier: getUserLoginIdentifier(userContext.user),
    username: userContext.user.username,
    displayName: userContext.user.displayName,
    roles: userContext.roles || [],
  };
}

export async function signUpWithEmailPassword(input, requestMeta) {
  const payload = signUpSchema.parse(input);
  const identifier = normalizeAuthIdentifier(getSubmittedIdentifier(payload));
  await db.role.upsert({
    where: { name: "USER" },
    update: {},
    create: {
      name: "USER",
      description: "Standard app user",
    },
  });
  const existingUser =
    identifier.type === "email"
      ? await db.user.findUnique({
          where: { email: identifier.email },
          select: { id: true },
        })
      : await db.user.findUnique({
          where: { phoneNumber: identifier.phoneNumber },
          select: { id: true },
        });

  if (existingUser) {
    throw new Error("A user with this email address or phone number already exists.");
  }

  const username = await resolveUsername(payload.username, identifier, payload.displayName);
  const passwordHash = await hashPassword(payload.password);
  const user = await db.user.create({
    data: {
      email: identifier.email,
      phoneNumber: identifier.phoneNumber,
      username,
      displayName: payload.displayName,
      passwordHash,
      roles: {
        create: [{ role: { connect: { name: "USER" } } }],
      },
    },
    include: {
      roles: { include: { role: true } },
    },
  });

  const session = await createSession(user.id, requestMeta);
  await logAuditEvent({
    actorUserId: user.id,
    action: "auth.signup",
    entityType: "User",
    entityId: user.id,
    metadata: {
      identifierType: identifier.type,
      loginIdentifier: getUserLoginIdentifier(user),
      username: user.username,
    },
  });
  return { user, session };
}

export async function loginWithEmailPassword(input, requestMeta) {
  const payload = authSchema.parse(input);
  const identifier = normalizeAuthIdentifier(getSubmittedIdentifier(payload));
  const user =
    identifier.type === "email"
      ? await db.user.findUnique({
          where: { email: identifier.email },
          include: {
            roles: { include: { role: true } },
          },
        })
      : await db.user.findUnique({
          where: { phoneNumber: identifier.phoneNumber },
          include: {
            roles: { include: { role: true } },
          },
        });

  if (!user || !user.isActive) {
    return null;
  }

  const valid = await verifyPassword(payload.password, user.passwordHash);
  if (!valid) {
    return null;
  }

  const session = await createSession(user.id, requestMeta);
  await logAuditEvent({
    actorUserId: user.id,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    metadata: {
      identifierType: identifier.type,
      loginIdentifier: getUserLoginIdentifier(user),
    },
  });
  return { user, session };
}

export async function createSession(userId, requestMeta = {}) {
  const token = createOpaqueToken();
  const session = await db.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      ipAddress: requestMeta.ipAddress || null,
      userAgent: requestMeta.userAgent || null,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return { ...session, token };
}

export function writeSessionCookie(response, token, accessInput = null) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });

  return accessInput ? writeAccessCookie(response, accessInput) : response;
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(STEP_UP_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(ACCESS_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function revokeSessionByToken(token) {
  if (!token) {
    return;
  }
  await db.session.updateMany({
    where: {
      tokenHash: sha256(token),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function getCurrentUserFromRequest(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return getCurrentUserFromSessionToken(token);
}

export async function getCurrentUserFromSessionToken(token) {
  const session = await db.session.findFirst({
    where: {
      tokenHash: sha256(token),
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        include: {
          roles: { include: { role: true } },
        },
      },
    },
  });

  if (!session || !session.user || !session.user.isActive) {
    return null;
  }

  await db.session.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });

  return {
    session,
    user: session.user,
    roles: session.user.roles.map((entry) => entry.role.name),
  };
}

export function requireRoles(userContext, allowedRoles) {
  const normalized = allowedRoles.map((role) => role.toUpperCase());
  const hasRole = userContext.roles.some((role) => normalized.includes(role));
  if (!hasRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function issueStepUpToken(request, input) {
  const userContext = await getCurrentUserFromRequest(request);
  if (!userContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = stepUpSchema.parse(input);
  const validPassword = await verifyPassword(payload.password, userContext.user.passwordHash);
  if (!validPassword) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const exp = Date.now() + STEP_UP_TTL_MS;
  const body = JSON.stringify({
    userId: userContext.user.id,
    purpose: payload.purpose,
    exp,
  });
  const signature = signPayload(body, getAuthSecret());
  const token = Buffer.from(body).toString("base64url") + "." + signature;

  await logAuditEvent({
    actorUserId: userContext.user.id,
    action: "auth.step_up.issued",
    entityType: "User",
    entityId: userContext.user.id,
    metadata: { purpose: payload.purpose, exp },
  });

  const response = NextResponse.json({ ok: true, expiresAt: exp });
  response.cookies.set(STEP_UP_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STEP_UP_TTL_MS / 1000,
  });
  return response;
}

export async function requireStepUp(request, expectedPurpose) {
  const token = request.cookies.get(STEP_UP_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Step-up verification required." }, { status: 401 });
  }
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return NextResponse.json({ error: "Invalid step-up token." }, { status: 401 });
  }

  const payloadRaw = Buffer.from(encodedPayload, "base64url").toString("utf8");
  const expectedSignature = signPayload(payloadRaw, getAuthSecret());
  if (signature !== expectedSignature) {
    return NextResponse.json({ error: "Invalid step-up signature." }, { status: 401 });
  }

  const payload = JSON.parse(payloadRaw);
  if (Date.now() > payload.exp) {
    return NextResponse.json({ error: "Step-up token expired." }, { status: 401 });
  }
  if (payload.purpose !== expectedPurpose) {
    return NextResponse.json({ error: "Step-up token purpose mismatch." }, { status: 403 });
  }
  return null;
}

export async function requireAuthenticatedUser(request) {
  const userContext = await getCurrentUserFromRequest(request);
  if (!userContext) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userContext };
}

export async function revokeSessionById(userId, sessionId) {
  if (!userId || !sessionId) {
    return 0;
  }

  const result = await db.session.updateMany({
    where: {
      id: sessionId,
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count;
}

export async function revokeOtherSessions(userId, currentSessionId) {
  if (!userId || !currentSessionId) {
    return 0;
  }

  const result = await db.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      id: {
        not: currentSessionId,
      },
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count;
}

export async function revokeAllSessionsForUser(userId) {
  if (!userId) {
    return 0;
  }

  const result = await db.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count;
}

export async function getCurrentUserFromServer() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  return getCurrentUserFromSessionToken(token);
}

export function getCurrentSessionCookieValue() {
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}
