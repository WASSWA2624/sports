import { createOpaqueToken, sha256 } from "./security";
import { db } from "./db";

function normalizeForAudit(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForAudit(entry));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = normalizeForAudit(value[key]);
        return accumulator;
      }, {});
  }

  return value;
}

function buildAuditHashPayload(input) {
  return JSON.stringify(normalizeForAudit(input));
}

export function buildAuditContext(request, userContext = null) {
  const forwardedFor = request?.headers?.get("x-forwarded-for") || null;

  return {
    actorUserId: userContext?.user?.id || null,
    actorRoles: userContext?.roles || null,
    requestId: request?.headers?.get("x-request-id") || createOpaqueToken().slice(0, 16),
    ipAddress: forwardedFor ? forwardedFor.split(",")[0].trim() : null,
    userAgent: request?.headers?.get("user-agent") || null,
  };
}

export async function logAuditEvent({
  actorUserId = null,
  action,
  entityType,
  entityId,
  requestId = null,
  actorRoles = null,
  ipAddress = null,
  userAgent = null,
  metadata = null,
}) {
  const createdAt = new Date();
  const latestLog = await db.auditLog.findFirst({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { eventHash: true },
  });
  const previousHash = latestLog?.eventHash || null;
  const eventHash = sha256(
    buildAuditHashPayload({
      actorUserId,
      action,
      entityType,
      entityId,
      requestId,
      actorRoles,
      ipAddress,
      userAgent,
      metadata,
      previousHash,
      createdAt,
    })
  );

  return db.auditLog.create({
    data: {
      actorUserId,
      action,
      entityType,
      entityId,
      requestId,
      actorRoles,
      ipAddress,
      userAgent,
      previousHash,
      eventHash,
      metadata,
      createdAt,
    },
  });
}
