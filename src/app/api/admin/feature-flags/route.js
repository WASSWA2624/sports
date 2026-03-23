import { NextResponse } from "next/server";
import {
  requireAuthenticatedUser,
  requireRoles,
  requireStepUp,
} from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { logAuditEvent } from "../../../../lib/audit";

export async function GET(request) {
  const { error, userContext } = await requireAuthenticatedUser(request);
  if (error) {
    return error;
  }

  const roleError = requireRoles(userContext, ["ADMIN"]);
  if (roleError) {
    return roleError;
  }

  const stepUpError = await requireStepUp(request, "admin");
  if (stepUpError) {
    return stepUpError;
  }

  const flags = await db.featureFlag.findMany({
    orderBy: { key: "asc" },
  });
  await logAuditEvent({
    actorUserId: userContext.user.id,
    action: "admin.feature_flags.read",
    entityType: "FeatureFlag",
    entityId: "all",
  });
  return NextResponse.json({ items: flags });
}
