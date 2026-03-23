import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import {
  formatFavoriteItemId,
  normalizeFavoriteItems,
  normalizeFavoritePayload,
} from "../../../lib/favorites";
import { logAuditEvent } from "../../../lib/audit";

const favoriteSchema = z.object({
  itemId: z.string().optional(),
  entityType: z.enum(["FIXTURE", "TEAM", "COMPETITION"]).optional(),
  entityId: z.string().optional(),
  label: z.string().max(120).optional(),
  metadata: z.any().optional(),
});

const batchSchema = z.object({
  itemIds: z.array(z.string()).min(1),
});

export async function GET(request) {
  const { error, userContext } = await requireAuthenticatedUser(request);
  if (error) {
    return error;
  }

  const items = await db.favoriteEntity.findMany({
    where: { userId: userContext.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      entityType: item.entityType,
      entityId: item.entityId,
      itemId: formatFavoriteItemId(item),
      label: item.label,
      metadata: item.metadata,
      createdAt: item.createdAt,
    })),
  });
}

export async function POST(request) {
  try {
    const { error, userContext } = await requireAuthenticatedUser(request);
    if (error) {
      return error;
    }

    const body = await request.json();

    if (Array.isArray(body?.itemIds) || Array.isArray(body?.items)) {
      const payload = batchSchema.parse({
        itemIds: body.itemIds || body.items,
      });

      const itemIds = normalizeFavoriteItems(payload.itemIds);
      await db.$transaction(
        itemIds.map((itemId) => {
          const normalized = normalizeFavoritePayload({ itemId });
          return db.favoriteEntity.upsert({
            where: {
              userId_entityType_entityId: {
                userId: userContext.user.id,
                entityType: normalized.entityType,
                entityId: normalized.entityId,
              },
            },
            update: {},
            create: {
              userId: userContext.user.id,
              entityType: normalized.entityType,
              entityId: normalized.entityId,
            },
          });
        })
      );

      await logAuditEvent({
        actorUserId: userContext.user.id,
        action: "favorites.batch_merged",
        entityType: "FavoriteEntity",
        entityId: "batch",
        metadata: { count: itemIds.length },
      });

      return NextResponse.json({ ok: true, itemIds });
    }

    const payload = favoriteSchema.parse(body);
    const normalized = normalizeFavoritePayload(payload);

    const favorite = await db.favoriteEntity.upsert({
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
      },
      create: {
        userId: userContext.user.id,
        entityType: normalized.entityType,
        entityId: normalized.entityId,
        label: payload.label,
        metadata: payload.metadata,
      },
    });

    await logAuditEvent({
      actorUserId: userContext.user.id,
      action: "favorites.created",
      entityType: "FavoriteEntity",
      entityId: favorite.id,
      metadata: normalized,
    });

    return NextResponse.json({
      ok: true,
      item: {
        id: favorite.id,
        entityType: favorite.entityType,
        entityId: favorite.entityId,
        itemId: formatFavoriteItemId(favorite),
        label: favorite.label,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to save favorite." },
      { status: 400 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { error, userContext } = await requireAuthenticatedUser(request);
    if (error) {
      return error;
    }

    const itemId = request.nextUrl.searchParams.get("itemId");
    const normalized = normalizeFavoritePayload({ itemId });

    await db.favoriteEntity.deleteMany({
      where: {
        userId: userContext.user.id,
        entityType: normalized.entityType,
        entityId: normalized.entityId,
      },
    });

    await logAuditEvent({
      actorUserId: userContext.user.id,
      action: "favorites.deleted",
      entityType: "FavoriteEntity",
      entityId: itemId,
      metadata: normalized,
    });

    return NextResponse.json({ ok: true, itemId: formatFavoriteItemId(normalized) });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to remove favorite." },
      { status: 400 }
    );
  }
}
