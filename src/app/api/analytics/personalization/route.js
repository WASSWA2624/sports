import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserFromRequest } from "../../../../lib/auth";
import { logAuditEvent } from "../../../../lib/audit";

const analyticsSchema = z.object({
  event: z.enum(["favorite_created", "alert_opt_in", "favorites_return_usage"]),
  surface: z.string().min(1).max(64),
  itemId: z.string().max(191).optional(),
  notificationType: z.string().max(64).optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
});

async function parsePayload(request) {
  const rawBody = await request.text();
  if (!rawBody) {
    return null;
  }

  return analyticsSchema.parse(JSON.parse(rawBody));
}

export async function POST(request) {
  let payload = null;

  try {
    payload = await parsePayload(request);
  } catch (error) {
    return NextResponse.json({ error: "Invalid analytics payload" }, { status: 400 });
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
    await logAuditEvent({
      actorUserId,
      action: `analytics.personalization.${payload.event}`,
      entityType: "Personalization",
      entityId: payload.itemId || payload.surface,
      metadata: payload,
    });
  } catch (error) {
    // Analytics should never block the user path.
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
