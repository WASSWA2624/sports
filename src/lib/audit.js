import { db } from "./db";

export async function logAuditEvent({
  actorUserId = null,
  action,
  entityType,
  entityId,
  metadata = null,
}) {
  return db.auditLog.create({
    data: {
      actorUserId,
      action,
      entityType,
      entityId,
      metadata,
    },
  });
}
