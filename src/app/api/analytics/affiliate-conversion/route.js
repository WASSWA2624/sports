import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserFromRequest } from "../../../../lib/auth";
import { logAuditEvent } from "../../../../lib/audit";
import { db } from "../../../../lib/db";

const conversionSchema = z.object({
  affiliateLinkId: z.string().max(191).optional().nullable(),
  bookmakerId: z.string().max(191).optional().nullable(),
  clickEventId: z.string().max(191).optional().nullable(),
  fixtureId: z.string().max(191).optional().nullable(),
  competitionId: z.string().max(191).optional().nullable(),
  geo: z.string().max(16).optional().nullable(),
  locale: z.string().max(16).optional().nullable(),
  surface: z.string().min(1).max(64),
  targetEntityType: z.string().max(64).optional().nullable(),
  targetEntityId: z.string().max(191).optional().nullable(),
  externalRef: z.string().max(191).optional().nullable(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "SETTLED"]).default("PENDING"),
  currency: z.string().max(16).optional().default("USD"),
  amount: z.coerce.number().optional().nullable(),
  revenue: z.coerce.number().optional().nullable(),
  convertedAt: z.string().datetime().optional().nullable(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
});

async function parsePayload(request) {
  const rawBody = await request.text();
  if (!rawBody) {
    return null;
  }

  return conversionSchema.parse(JSON.parse(rawBody));
}

function buildConversionData(payload, actorUserId) {
  return {
    affiliateLinkId: payload.affiliateLinkId || null,
    bookmakerId: payload.bookmakerId || null,
    clickEventId: payload.clickEventId || null,
    userId: actorUserId,
    fixtureId: payload.fixtureId || null,
    competitionId: payload.competitionId || null,
    geo: payload.geo || null,
    locale: payload.locale || null,
    surface: payload.surface,
    targetEntityType: payload.targetEntityType || null,
    targetEntityId: payload.targetEntityId || null,
    status: payload.status,
    currency: payload.currency || "USD",
    amount: payload.amount ?? null,
    revenue: payload.revenue ?? null,
    convertedAt: payload.convertedAt ? new Date(payload.convertedAt) : null,
    metadata: payload.metadata || null,
  };
}

export async function POST(request) {
  let payload = null;

  try {
    payload = await parsePayload(request);
  } catch (error) {
    return NextResponse.json({ error: "Invalid affiliate conversion payload" }, { status: 400 });
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
    const data = buildConversionData(payload, actorUserId);
    const conversionEvent = payload.externalRef
      ? await db.conversionEvent.upsert({
          where: {
            externalRef: payload.externalRef,
          },
          update: data,
          create: {
            ...data,
            externalRef: payload.externalRef,
          },
        })
      : await db.conversionEvent.create({
          data,
        });

    await logAuditEvent({
      actorUserId,
      action: "analytics.affiliate.conversion",
      entityType: "ConversionEvent",
      entityId: conversionEvent.id,
      metadata: payload,
    });
  } catch (error) {
    // Conversion tracking should never block the client path.
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
