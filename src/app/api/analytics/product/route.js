import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserFromRequest } from "../../../../lib/auth";
import { logAuditEvent } from "../../../../lib/audit";

const analyticsSchema = z.object({
  event: z.enum([
    "search_query",
    "search_zero_results",
    "search_result_click",
    "search_discovery_click",
    "onboarding_completed",
    "onboarding_dismissed",
    "prompt_opt_in_changed",
    "return_session",
    "favorites_depth_changed",
    "news_module_view",
    "news_article_view",
    "news_article_click",
    "odds_cta_click",
    "prediction_cta_click",
    "broadcast_channel_click",
    "funnel_cta_click",
  ]),
  surface: z.string().min(1).max(64),
  entityType: z.string().max(64).optional(),
  entityId: z.string().max(191).optional(),
  query: z.string().max(120).optional(),
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
      action: `analytics.product.${payload.event}`,
      entityType: payload.entityType || "ProductAnalytics",
      entityId: payload.entityId || payload.surface,
      metadata: payload,
    });
  } catch (error) {
    // Product analytics should never block the user path.
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
