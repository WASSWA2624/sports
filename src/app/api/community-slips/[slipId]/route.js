import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getCurrentUserFromRequest,
  requireAuthenticatedUser,
} from "../../../../lib/auth";
import {
  getCommunitySlipById,
  saveCommunitySlip,
} from "../../../../lib/community-slips";
import { logAuditEvent } from "../../../../lib/audit";

const pickSchema = z.object({
  fixtureId: z.string().min(1).max(191).optional().nullable(),
  oddsSelectionId: z.string().min(1).max(191),
  oddsMarketId: z.string().min(1).max(191).optional().nullable(),
  reason: z.string().max(500).optional().nullable(),
});

const updateSlipSchema = z.object({
  title: z.string().max(191).optional().nullable(),
  summary: z.string().max(1200).optional().nullable(),
  stakeAmount: z.coerce.number().min(0).max(1000000).optional().nullable(),
  publish: z.boolean().optional().default(false),
  picks: z.array(pickSchema).min(1).max(8),
});

export async function GET(request, { params }) {
  const { slipId } = await params;
  const locale = request.nextUrl.searchParams.get("locale") || "en";
  const userContext = await getCurrentUserFromRequest(request).catch(() => null);
  const slip = await getCommunitySlipById(slipId, {
    locale,
    currentUserId: userContext?.user?.id || null,
  });

  if (!slip) {
    return NextResponse.json({ error: "Slip not found." }, { status: 404 });
  }

  return NextResponse.json({ slip });
}

export async function PUT(request, { params }) {
  try {
    const { slipId } = await params;
    const { error, userContext } = await requireAuthenticatedUser(request);
    if (error) {
      return error;
    }

    const payload = updateSlipSchema.parse(await request.json());
    const slip = await saveCommunitySlip({
      userId: userContext.user.id,
      slipId,
      locale: request.nextUrl.searchParams.get("locale") || "en",
      title: payload.title,
      summary: payload.summary,
      stakeAmount: payload.stakeAmount ?? null,
      publish: payload.publish,
      picks: payload.picks,
    });

    await logAuditEvent({
      actorUserId: userContext.user.id,
      action: payload.publish ? "community_slip.updated_and_published" : "community_slip.updated",
      entityType: "CommunitySlip",
      entityId: slip.id,
      metadata: {
        publish: payload.publish,
        selectionCount: slip.selectionCount,
      },
    });

    return NextResponse.json({ ok: true, slip });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update betting slip." },
      { status: 400 }
    );
  }
}
