import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuthenticatedUser,
  requireStepUp,
  revokeOtherSessions,
  toSessionUserPayload,
} from "../../../../lib/auth";
import { logAuditEvent } from "../../../../lib/audit";
import { db } from "../../../../lib/db";
import { hashPassword } from "../../../../lib/security";

const profileSecuritySchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  nextPassword: z.string().min(8).max(128).optional(),
  signOutOtherSessions: z.boolean().default(true),
});

export async function PATCH(request) {
  try {
    const { error, userContext } = await requireAuthenticatedUser(request);
    if (error) {
      return error;
    }

    const stepUpError = await requireStepUp(request, "profile-security");
    if (stepUpError) {
      return stepUpError;
    }

    const payload = profileSecuritySchema.parse(await request.json());
    if (!payload.displayName && !payload.nextPassword) {
      throw new Error("Include a display name update or a new password.");
    }

    const updateData = {};

    if (payload.displayName) {
      updateData.displayName = payload.displayName;
    }

    if (payload.nextPassword) {
      updateData.passwordHash = await hashPassword(payload.nextPassword);
    }

    const user = await db.user.update({
      where: {
        id: userContext.user.id,
      },
      data: updateData,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    let revokedSessionCount = 0;

    if (payload.nextPassword && payload.signOutOtherSessions && userContext.session?.id) {
      revokedSessionCount = await revokeOtherSessions(user.id, userContext.session.id);
    }

    await logAuditEvent({
      actorUserId: userContext.user.id,
      actorRoles: userContext.roles,
      requestId: request.headers.get("x-request-id"),
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
      action: payload.nextPassword ? "profile.security.password_changed" : "profile.security.updated",
      entityType: "User",
      entityId: userContext.user.id,
      metadata: {
        displayNameChanged: Boolean(payload.displayName),
        passwordChanged: Boolean(payload.nextPassword),
        revokedSessionCount,
      },
    });

    return NextResponse.json({
      ok: true,
      message: payload.nextPassword
        ? "Security settings updated and other sessions revoked."
        : "Profile identity updated.",
      revokedSessionCount,
      user: toSessionUserPayload({
        user,
        roles: user.roles.map((entry) => entry.role.name),
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Profile security update failed." },
      { status: 400 },
    );
  }
}
