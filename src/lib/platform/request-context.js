import { cookies, headers } from "next/headers";
import {
  DEFAULT_MARKET_GEO,
  GEO_COOKIE_NAME,
  VIEWER_GEO_HEADER,
  normalizeGeo,
} from "../coreui/route-context";

export async function getViewerGeo() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieGeo = cookieStore.get(GEO_COOKIE_NAME)?.value;
  const headerGeo =
    headerStore.get(VIEWER_GEO_HEADER) ||
    headerStore.get("x-vercel-ip-country") ||
    headerStore.get("cf-ipcountry");

  return normalizeGeo(cookieGeo || headerGeo, DEFAULT_MARKET_GEO);
}
