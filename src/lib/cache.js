import { revalidateTag } from "next/cache";
import { logAuditEvent } from "./audit";

export const COREUI_CACHE_TAGS = [
  "coreui:home",
  "coreui:live",
  "coreui:fixtures",
  "coreui:results",
  "coreui:tables",
  "coreui:leagues",
  "coreui:teams",
  "coreui:shell",
];

export const NEWS_CACHE_TAGS = [
  "news:hub",
  "news:articles",
  "news:homepage",
  "news:latest",
];

export const FEATURE_CACHE_TAGS = ["feature-flags"];

export const KNOWN_CACHE_TAGS = [
  ...COREUI_CACHE_TAGS,
  ...NEWS_CACHE_TAGS,
  ...FEATURE_CACHE_TAGS,
];

export async function revalidateTagsWithAudit(
  tags,
  {
    actorUserId = null,
    requestId = null,
    actorRoles = null,
    ipAddress = null,
    userAgent = null,
    source = "unknown",
    metadata = null,
  } = {}
) {
  const uniqueTags = [...new Set((tags || []).filter(Boolean))];

  for (const tag of uniqueTags) {
    revalidateTag(tag);
    await logAuditEvent({
      actorUserId,
      requestId,
      actorRoles,
      ipAddress,
      userAgent,
      action: "cache.revalidated",
      entityType: "CacheTag",
      entityId: tag,
      metadata: {
        source,
        ...(metadata && typeof metadata === "object" ? metadata : {}),
      },
    });
  }

  return uniqueTags;
}
