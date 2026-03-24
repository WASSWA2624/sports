import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearSessionCookie,
  requireAuthenticatedUser,
  revokeAllSessionsForUser,
  revokeOtherSessions,
  revokeSessionById,
} from "../../../../lib/auth";
import { logAuditEvent } from "../../../../lib/audit";
import { db } from "../../../../lib/db";

const deleteSchema = z.object({
  scope: z.enum(["current", "others", "all"]).default("current"),
  sessionId: z.string().min(1).optional(),
});

function formatSession(session, currentSessionId) {
  return {
    id: session.id,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    isCurrent: session.id === currentSessionId,
  };
}

export async function GET(request) {
  const { error, userContext } = await requireAuthenticatedUser(request);
  if (error) {
    return error;
  }

  const sessions = await db.session.findMany({
    where: {
      userId: userContext.user.id,
    },
    orderBy: [{ revokedAt: "asc" }, { lastSeenAt: "desc" }, { createdAt: "desc" }],
    take: 8,
  });

  return NextResponse.json({
    currentSessionId: userContext.session?.id || null,
    sessions: sessions.map((session) => formatSession(session, userContext.session?.id)),
  });
}

export async function DELETE(request) {
  try {
    const { error, userContext } = await requireAuthenticatedUser(request);
    if (error) {
      return error;
    }

    const payload = deleteSchema.parse(
      request.method === "DELETE" ? await request.json().catch(() => ({})) : {}
    );
    const currentSessionId = userContext.session?.id || null;
    let revokedCount = 0;
    let clearCookies = false;

    if (payload.sessionId) {
      revokedCount = await revokeSessionById(userContext.user.id, payload.sessionId);
      clearCookies = payload.sessionId === currentSessionId;
    } else if (payload.scope === "others") {
      revokedCount = await revokeOtherSessions(userContext.user.id, currentSessionId);
    } else if (payload.scope === "all") {
      revokedCount = await revokeAllSessionsForUser(userContext.user.id);
      clearCookies = true;
    } else {
      revokedCount = await revokeSessionById(userContext.user.id, currentSessionId);
      clearCookies = true;
    }

    await logAuditEvent({
      actorUserId: userContext.user.id,
      actorRoles: userContext.roles,
      requestId: request.headers.get("x-request-id"),
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
      action: "auth.session.revoked",
      entityType: "Session",
      entityId: payload.sessionId || payload.scope,
      metadata: {
        scope: payload.scope,
        sessionId: payload.sessionId || null,
        revokedCount,
      },
    });

    const response = NextResponse.json({
      ok: true,
      revokedCount,
      signedOutCurrentSession: clearCookies,
    });

    return clearCookies ? clearSessionCookie(response) : response;
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to revoke sessions." },
      { status: 400 }
    );
  }
}
