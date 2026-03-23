import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuthenticatedUser,
  requireStepUp,
} from "../../../../lib/auth";
import { logAuditEvent } from "../../../../lib/audit";

const profileSecuritySchema = z.object({
  displayName: z.string().min(2).max(80),
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
    await logAuditEvent({
      actorUserId: userContext.user.id,
      action: "profile.security.changed",
      entityType: "User",
      entityId: userContext.user.id,
      metadata: payload,
    });

    return NextResponse.json({
      ok: true,
      message: "Profile security action verified with step-up.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Profile security update failed." },
      { status: 400 },
    );
  }
}
