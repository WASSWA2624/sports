import {
  requireAuthenticatedUser,
  requireRoles,
  requireStepUp,
} from "./auth";
import { buildAuditContext } from "./audit";

export async function requireEditorAccess(request) {
  const { error, userContext } = await requireAuthenticatedUser(request);
  if (error) {
    return { error };
  }

  const roleError = requireRoles(userContext, ["EDITOR", "ADMIN"]);
  if (roleError) {
    return { error: roleError };
  }

  return {
    userContext,
    auditContext: buildAuditContext(request, userContext),
  };
}

export async function requireAdminAccess(request, { stepUp = false } = {}) {
  const { error, userContext } = await requireAuthenticatedUser(request);
  if (error) {
    return { error };
  }

  const roleError = requireRoles(userContext, ["ADMIN"]);
  if (roleError) {
    return { error: roleError };
  }

  if (stepUp) {
    const stepUpError = await requireStepUp(request, "admin");
    if (stepUpError) {
      return { error: stepUpError };
    }
  }

  return {
    userContext,
    auditContext: buildAuditContext(request, userContext),
  };
}
