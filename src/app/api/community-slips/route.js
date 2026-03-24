import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getCurrentUserFromRequest,
  requireAuthenticatedUser,
} from "../../../lib/auth";
import {
  getCommunitySlipHubData,
  saveCommunitySlip,
} from "../../../lib/community-slips";
import { logAuditEvent } from "../../../lib/audit";

const pickSchema = z.object({
  fixtureId: z.string().min(1).max(191).optional().nullable(),
  oddsSelectionId: z.string().min(1).max(191),
  oddsMarketId: z.string().min(1).max(191).optional().nullable(),
});

const createSlipSchema = z.object({
  title: z.string().max(191).optional().nullable(),
  summary: z.string().max(1200).optional().nullable(),
  stakeAmount: z.coerce.number().min(0).max(1000000).optional().nullable(),
  publish: z.boolean().optional().default(false),
  picks: z.array(pickSchema).min(1).max(8),
});

export async function GET(request) {
  const locale = request.nextUrl.searchParams.get("locale") || "en";
  const viewerTerritory = request.nextUrl.searchParams.get("territory") || "US";
  const fixtureId = request.nextUrl.searchParams.get("fixtureId") || null;
  const withComposer =
    request.nextUrl.searchParams.get("withComposer") === "1" ||
    request.nextUrl.searchParams.get("withComposer") === "true";

  const userContext = await getCurrentUserFromRequest(request).catch(() => null);
  const data = await getCommunitySlipHubData({
    locale,
    viewerTerritory,
    currentUserId: userContext?.user?.id || null,
    fixtureId,
    includeComposerCatalog: withComposer,
  });

  return NextResponse.json(data);
}

export async function POST(request) {
  try {
    const { error, userContext } = await requireAuthenticatedUser(request);
    if (error) {
      return error;
    }

    const payload = createSlipSchema.parse(await request.json());
    const slip = await saveCommunitySlip({
      userId: userContext.user.id,
      locale: request.nextUrl.searchParams.get("locale") || "en",
      title: payload.title,
      summary: payload.summary,
      stakeAmount: payload.stakeAmount ?? null,
      publish: payload.publish,
      picks: payload.picks,
    });

    await logAuditEvent({
      actorUserId: userContext.user.id,
      action: payload.publish ? "community_slip.published" : "community_slip.saved",
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
      { error: error.message || "Failed to save betting slip." },
      { status: 400 }
    );
  }
}
