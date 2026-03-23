import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { logAuditEvent } from "../../../../lib/audit";

const preferencesSchema = z.object({
  locale: z.string().min(2).max(10).default("en"),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  timezone: z.string().min(2).max(80).default("UTC"),
  favoriteSports: z.array(z.string().min(2).max(40)).max(12).default([]),
  alertPreferences: z
    .object({
      goals: z.boolean().default(true),
      cards: z.boolean().default(false),
      kickoff: z.boolean().default(true),
      periodChange: z.boolean().default(false),
      finalResult: z.boolean().default(true),
    })
    .default({ goals: true, cards: false, kickoff: true, periodChange: false, finalResult: true }),
});

export async function GET(request) {
  const { error, userContext } = await requireAuthenticatedUser(request);
  if (error) {
    return error;
  }

  const prefs = await db.userPreference.findMany({
    where: {
      userId: userContext.user.id,
      key: { in: ["locale", "theme", "timezone", "favoriteSports", "alertPreferences"] },
    },
  });

  const result = Object.fromEntries(prefs.map((item) => [item.key, item.value]));
  return NextResponse.json({
    locale: result.locale ?? "en",
    theme: result.theme ?? "system",
    timezone: result.timezone ?? "UTC",
    favoriteSports: result.favoriteSports ?? [],
    alertPreferences:
      result.alertPreferences ?? {
        goals: true,
        cards: false,
        kickoff: true,
        periodChange: false,
        finalResult: true,
      },
  });
}

export async function PUT(request) {
  try {
    const { error, userContext } = await requireAuthenticatedUser(request);
    if (error) {
      return error;
    }

    const payload = preferencesSchema.parse(await request.json());

    await db.$transaction([
      db.userPreference.upsert({
        where: { userId_key: { userId: userContext.user.id, key: "locale" } },
        update: { value: payload.locale },
        create: { userId: userContext.user.id, key: "locale", value: payload.locale },
      }),
      db.userPreference.upsert({
        where: { userId_key: { userId: userContext.user.id, key: "theme" } },
        update: { value: payload.theme },
        create: { userId: userContext.user.id, key: "theme", value: payload.theme },
      }),
      db.userPreference.upsert({
        where: { userId_key: { userId: userContext.user.id, key: "timezone" } },
        update: { value: payload.timezone },
        create: { userId: userContext.user.id, key: "timezone", value: payload.timezone },
      }),
      db.userPreference.upsert({
        where: { userId_key: { userId: userContext.user.id, key: "favoriteSports" } },
        update: { value: payload.favoriteSports },
        create: {
          userId: userContext.user.id,
          key: "favoriteSports",
          value: payload.favoriteSports,
        },
      }),
      db.userPreference.upsert({
        where: { userId_key: { userId: userContext.user.id, key: "alertPreferences" } },
        update: { value: payload.alertPreferences },
        create: {
          userId: userContext.user.id,
          key: "alertPreferences",
          value: payload.alertPreferences,
        },
      }),
    ]);

    await logAuditEvent({
      actorUserId: userContext.user.id,
      action: "profile.preferences.updated",
      entityType: "User",
      entityId: userContext.user.id,
      metadata: payload,
    });

    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update preferences." },
      { status: 400 },
    );
  }
}
