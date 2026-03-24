import { revalidateTag } from "next/cache";
import { logAuditEvent } from "./audit";
export {
  COREUI_CACHE_TAGS,
  FEATURE_CACHE_TAGS,
  KNOWN_CACHE_TAGS,
  NEWS_CACHE_TAGS,
} from "./cache-tags";

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
