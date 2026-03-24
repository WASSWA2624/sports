import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserFromRequest } from "../../../../lib/auth";
import { logAuditEvent } from "../../../../lib/audit";
import { db } from "../../../../lib/db";

const clickSchema = z.object({
  affiliateLinkId: z.string().max(191).optional().nullable(),
  bookmakerId: z.string().max(191).optional().nullable(),
  fixtureId: z.string().max(191).optional().nullable(),
  competitionId: z.string().max(191).optional().nullable(),
  geo: z.string().max(16).optional().nullable(),
  locale: z.string().max(16).optional().nullable(),
  surface: z.string().min(1).max(64),
  slotKey: z.string().max(120).optional().nullable(),
  targetEntityType: z.string().max(64).optional().nullable(),
  targetEntityId: z.string().max(191).optional().nullable(),
  referrerUrl: z.string().max(2000).optional().nullable(),
  targetUrl: z.string().max(2000),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
});

async function parsePayload(request) {
  const rawBody = await request.text();
  if (!rawBody) {
    return null;
  }

  return clickSchema.parse(JSON.parse(rawBody));
}

export async function POST(request) {
  let payload = null;

  try {
    payload = await parsePayload(request);
  } catch (error) {
    return NextResponse.json({ error: "Invalid affiliate click payload" }, { status: 400 });
  }

  if (!payload) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  let actorUserId = null;

  try {
    const userContext = await getCurrentUserFromRequest(request);
    actorUserId = userContext?.user?.id || null;
  } catch (error) {
    actorUserId = null;
  }

  try {
    const clickEvent = await db.clickEvent.create({
      data: {
        affiliateLinkId: payload.affiliateLinkId || null,
        bookmakerId: payload.bookmakerId || null,
        userId: actorUserId,
        fixtureId: payload.fixtureId || null,
        competitionId: payload.competitionId || null,
        geo: payload.geo || null,
        locale: payload.locale || null,
        surface: payload.surface,
        slotKey: payload.slotKey || null,
        targetEntityType: payload.targetEntityType || null,
        targetEntityId: payload.targetEntityId || null,
        requestId: request.headers.get("x-request-id"),
        referrerUrl: payload.referrerUrl || null,
        targetUrl: payload.targetUrl,
        metadata: payload.metadata || null,
      },
    });

    await logAuditEvent({
      actorUserId,
      action: "analytics.affiliate.click",
      entityType: "ClickEvent",
      entityId: clickEvent.id,
      metadata: payload,
    });
  } catch (error) {
    // Click tracking should never block the client path.
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
