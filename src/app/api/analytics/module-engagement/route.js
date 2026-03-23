import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserFromRequest } from "../../../../lib/auth";
import { logAuditEvent } from "../../../../lib/audit";

const analyticsSchema = z.object({
  event: z.enum(["view", "interact"]),
  moduleType: z.string().min(1).max(64),
  entityType: z.string().min(1).max(64),
  entityId: z.string().min(1).max(191),
  surface: z.string().min(1).max(64),
  action: z.string().max(120).optional(),
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
      action: `analytics.module.${payload.event}`,
      entityType: "ModuleEngagement",
      entityId: `${payload.entityType}:${payload.entityId}:${payload.moduleType}`,
      metadata: payload,
    });
  } catch (error) {
    // Analytics should never block the user path.
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
