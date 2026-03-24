import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { logAuditEvent } from "../../../../lib/audit";
import { VIEWER_GEO_HEADER } from "../../../../lib/coreui/route-context";
import {
  PROFILE_PREFERENCE_KEYS,
  getProfileComplianceSnapshot,
  mapProfilePreferencesToRecords,
  normalizeProfilePreferences,
  readProfilePreferencesFromEntries,
} from "../../../../lib/profile-preferences";

function getViewerGeoFromRequest(request) {
  return (
    request.headers.get(VIEWER_GEO_HEADER) ||
    request.cookies.get("sports_geo")?.value ||
    "INTL"
  );
}

export async function GET(request) {
  const { error, userContext } = await requireAuthenticatedUser(request);
  if (error) {
    return error;
  }

  const prefs = await db.userPreference.findMany({
    where: {
      userId: userContext.user.id,
      key: { in: PROFILE_PREFERENCE_KEYS },
    },
  });
  const viewerGeo = getViewerGeoFromRequest(request);
  const preferences = readProfilePreferencesFromEntries(prefs, {
    fallbackGeo: viewerGeo,
  });

  return NextResponse.json({
    ...preferences,
    compliance: getProfileComplianceSnapshot(preferences, {
      viewerGeo,
    }),
  });
}

export async function PUT(request) {
  try {
    const { error, userContext } = await requireAuthenticatedUser(request);
    if (error) {
      return error;
    }

    const viewerGeo = getViewerGeoFromRequest(request);
    const payload = normalizeProfilePreferences(await request.json(), {
      fallbackGeo: viewerGeo,
    });
    const records = mapProfilePreferencesToRecords(payload, {
      fallbackGeo: viewerGeo,
    });

    await db.$transaction([
      db.userPreference.upsert({
        where: { userId_key: { userId: userContext.user.id, key: "locale" } },
        update: { value: records.locale },
        create: { userId: userContext.user.id, key: "locale", value: records.locale },
      }),
      db.userPreference.upsert({
        where: { userId_key: { userId: userContext.user.id, key: "theme" } },
        update: { value: records.theme },
        create: { userId: userContext.user.id, key: "theme", value: records.theme },
      }),
      db.userPreference.upsert({
        where: { userId_key: { userId: userContext.user.id, key: "timezone" } },
        update: { value: records.timezone },
        create: { userId: userContext.user.id, key: "timezone", value: records.timezone },
      }),
      db.userPreference.upsert({
        where: { userId_key: { userId: userContext.user.id, key: "favoriteSports" } },
        update: { value: records.favoriteSports },
        create: {
          userId: userContext.user.id,
          key: "favoriteSports",
          value: records.favoriteSports,
        },
      }),
      db.userPreference.upsert({
        where: { userId_key: { userId: userContext.user.id, key: "alertPreferences" } },
        update: { value: records.alertPreferences },
        create: {
          userId: userContext.user.id,
          key: "alertPreferences",
          value: records.alertPreferences,
        },
      }),
      db.userPreference.upsert({
        where: { userId_key: { userId: userContext.user.id, key: "promptPreferences" } },
        update: { value: records.promptPreferences },
        create: {
          userId: userContext.user.id,
          key: "promptPreferences",
          value: records.promptPreferences,
        },
      }),
      db.userPreference.upsert({
        where: { userId_key: { userId: userContext.user.id, key: "marketPreferences" } },
        update: { value: records.marketPreferences },
        create: {
          userId: userContext.user.id,
          key: "marketPreferences",
          value: records.marketPreferences,
        },
      }),
      db.userPreference.upsert({
        where: { userId_key: { userId: userContext.user.id, key: "onboardingState" } },
        update: { value: records.onboardingState },
        create: {
          userId: userContext.user.id,
          key: "onboardingState",
          value: records.onboardingState,
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

    return NextResponse.json({
      ok: true,
      ...payload,
      compliance: getProfileComplianceSnapshot(payload, {
        viewerGeo,
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update preferences." },
      { status: 400 },
    );
  }
}
