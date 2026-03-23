import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuthenticatedUser,
  requireRoles,
  requireStepUp,
} from "../../../../lib/auth";
import { logAuditEvent } from "../../../../lib/audit";

const payoutSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).default("USD"),
});

export async function POST(request) {
  try {
    const { error, userContext } = await requireAuthenticatedUser(request);
    if (error) {
      return error;
    }

    const roleError = requireRoles(userContext, ["CREATOR", "ADMIN"]);
    if (roleError) {
      return roleError;
    }

    const stepUpError = await requireStepUp(request, "payout");
    if (stepUpError) {
      return stepUpError;
    }

    const payload = payoutSchema.parse(await request.json());
    await logAuditEvent({
      actorUserId: userContext.user.id,
      action: "payout.requested",
      entityType: "User",
      entityId: userContext.user.id,
      metadata: payload,
    });

    return NextResponse.json({
      ok: true,
      message: "Payout request accepted for processing.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Payout request failed." },
      { status: 400 },
    );
  }
}
