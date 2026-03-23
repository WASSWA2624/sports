import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../lib/admin-auth";
import { db } from "../../../../lib/db";
import { logAuditEvent } from "../../../../lib/audit";

export async function GET(request) {
  const { error, auditContext } = await requireAdminAccess(request);
  if (error) {
    return error;
  }

  const flags = await db.featureFlag.findMany({
    orderBy: { key: "asc" },
  });
  await logAuditEvent({
    ...auditContext,
    action: "admin.feature_flags.read",
    entityType: "FeatureFlag",
    entityId: "all",
  });
  return NextResponse.json({ items: flags });
}
