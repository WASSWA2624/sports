import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  getCurrentUserFromRequest,
  revokeSessionByToken,
} from "../../../../lib/auth";
import { logAuditEvent } from "../../../../lib/audit";

export async function POST(request) {
  const token = request.cookies.get("sports_session")?.value;
  const userContext = await getCurrentUserFromRequest(request);

  if (token) {
    await revokeSessionByToken(token);
  }

  if (userContext) {
    await logAuditEvent({
      actorUserId: userContext.user.id,
      action: "auth.logout",
      entityType: "User",
      entityId: userContext.user.id,
    });
  }

  const response = NextResponse.json({ ok: true });
  return clearSessionCookie(response);
}
