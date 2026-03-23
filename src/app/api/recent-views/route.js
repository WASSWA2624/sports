import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserFromRequest } from "../../../lib/auth";
import { normalizeFavoritePayload } from "../../../lib/favorites";
import { db } from "../../../lib/db";

const recentViewSchema = z.object({
  itemId: z.string().optional(),
  entityType: z.enum(["FIXTURE", "TEAM", "COMPETITION"]).optional(),
  entityId: z.string().optional(),
  label: z.string().max(120).optional(),
  metadata: z.any().optional(),
});

export async function POST(request) {
  try {
    const userContext = await getCurrentUserFromRequest(request);
    if (!userContext) {
      return NextResponse.json({ ok: true }, { status: 202 });
    }

    const payload = recentViewSchema.parse(await request.json());
    const normalized = normalizeFavoritePayload(payload);

    await db.recentView.upsert({
      where: {
        userId_entityType_entityId: {
          userId: userContext.user.id,
          entityType: normalized.entityType,
          entityId: normalized.entityId,
        },
      },
      update: {
        label: payload.label ?? undefined,
        metadata: payload.metadata ?? undefined,
        viewedAt: new Date(),
      },
      create: {
        userId: userContext.user.id,
        entityType: normalized.entityType,
        entityId: normalized.entityId,
        label: payload.label,
        metadata: payload.metadata,
      },
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to store recent view." },
      { status: 400 }
    );
  }
}
