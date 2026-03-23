import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "../../../lib/auth";
import { buildAlertSettingsMap, formatAlertSubscriptionItem } from "../../../lib/alerts";
import { db } from "../../../lib/db";
import { logAuditEvent } from "../../../lib/audit";

const alertItemSchema = z.object({
  itemId: z.string(),
  notificationTypes: z.array(z.string()).min(1),
});

const alertMutationSchema = z.object({
  itemId: z.string().optional(),
  notificationType: z.string().optional(),
  notificationTypes: z.array(z.string()).optional(),
  items: z.array(alertItemSchema).optional(),
});

export async function GET(request) {
  const { error, userContext } = await requireAuthenticatedUser(request);
  if (error) {
    return error;
  }

  const items = await db.notificationSubscription.findMany({
    where: {
      userId: userContext.user.id,
      isEnabled: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return NextResponse.json({
    items,
    settings: buildAlertSettingsMap(items),
  });
}

export async function POST(request) {
  try {
    const { error, userContext } = await requireAuthenticatedUser(request);
    if (error) {
      return error;
    }

    const payload = alertMutationSchema.parse(await request.json());
    const incomingItems = payload.items?.length
      ? payload.items
      : [
          {
            itemId: payload.itemId,
            notificationTypes: payload.notificationTypes || [payload.notificationType].filter(Boolean),
          },
        ];

    const normalizedItems = incomingItems
      .map((item) => formatAlertSubscriptionItem(item.itemId, item.notificationTypes))
      .filter(Boolean);

    if (!normalizedItems.length) {
      throw new Error("Alert payload must include at least one valid subscription.");
    }

    await db.$transaction(
      normalizedItems.flatMap((item) =>
        item.notificationTypes.map((notificationType) =>
          db.notificationSubscription.upsert({
            where: {
              userId_entityType_entityId_notificationType: {
                userId: userContext.user.id,
                entityType: item.entityType,
                entityId: item.entityId,
                notificationType,
              },
            },
            update: {
              isEnabled: true,
            },
            create: {
              userId: userContext.user.id,
              entityType: item.entityType,
              entityId: item.entityId,
              notificationType,
              isEnabled: true,
            },
          })
        )
      )
    );

    await logAuditEvent({
      actorUserId: userContext.user.id,
      action: "alerts.subscription.updated",
      entityType: "NotificationSubscription",
      entityId: normalizedItems[0].itemId,
      metadata: {
        count: normalizedItems.length,
        items: normalizedItems,
      },
    });

    return NextResponse.json({
      ok: true,
      items: normalizedItems,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to save alert subscriptions." },
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
    const notificationType = request.nextUrl.searchParams.get("notificationType");
    const normalized = formatAlertSubscriptionItem(itemId, notificationType ? [notificationType] : []);

    if (!normalized) {
      throw new Error("Alert removal requires a valid item and notification type.");
    }

    await db.notificationSubscription.deleteMany({
      where: {
        userId: userContext.user.id,
        entityType: normalized.entityType,
        entityId: normalized.entityId,
        notificationType: normalized.notificationTypes[0],
      },
    });

    await logAuditEvent({
      actorUserId: userContext.user.id,
      action: "alerts.subscription.deleted",
      entityType: "NotificationSubscription",
      entityId: `${normalized.itemId}:${normalized.notificationTypes[0]}`,
      metadata: normalized,
    });

    return NextResponse.json({
      ok: true,
      itemId: normalized.itemId,
      notificationType: normalized.notificationTypes[0],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to remove alert subscription." },
      { status: 400 }
    );
  }
}
