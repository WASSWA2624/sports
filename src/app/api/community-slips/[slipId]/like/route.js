import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../../lib/auth";
import { toggleCommunitySlipLike } from "../../../../../lib/community-slips";
import { logAuditEvent } from "../../../../../lib/audit";

async function mutateLike(request, params, shouldLike) {
  const { slipId } = await params;
  const { error, userContext } = await requireAuthenticatedUser(request);
  if (error) {
    return error;
  }

  const slip = await toggleCommunitySlipLike({
    slipId,
    userId: userContext.user.id,
    locale: request.nextUrl.searchParams.get("locale") || "en",
    shouldLike,
  });

  await logAuditEvent({
    actorUserId: userContext.user.id,
    action: shouldLike ? "community_slip.liked" : "community_slip.unliked",
    entityType: "CommunitySlip",
    entityId: slip.id,
  });

  return NextResponse.json({ ok: true, slip });
}

export async function POST(request, context) {
  try {
    return await mutateLike(request, context.params, true);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to like betting slip." },
      { status: 400 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    return await mutateLike(request, context.params, false);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to remove betting slip like." },
      { status: 400 }
    );
  }
}
