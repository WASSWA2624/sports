import { NextResponse } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
} from "./lib/coreui/preferences";
import {
  GEO_COOKIE_NAME,
  GEO_QUERY_PARAM,
  REQUEST_ID_HEADER,
  VIEWER_GEO_HEADER,
  normalizeGeo,
} from "./lib/coreui/route-context";
import { getPlatformBootstrapConfig } from "./lib/platform/env";

function getLocaleForRequest(request) {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLanguage = request.headers.get("accept-language") || "";
  const match = acceptLanguage
    .split(",")
    .map((part) => part.trim().split(";")[0]?.toLowerCase())
    .find((locale) => SUPPORTED_LOCALES.includes(locale));

  return match || DEFAULT_LOCALE;
}

function hasLocalePrefix(pathname) {
  return SUPPORTED_LOCALES.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
}

function getGeoForRequest(request) {
  return normalizeGeo(
    request.nextUrl.searchParams.get(GEO_QUERY_PARAM) ||
      request.cookies.get(GEO_COOKIE_NAME)?.value ||
      request.headers.get(VIEWER_GEO_HEADER) ||
      request.headers.get("x-vercel-ip-country") ||
      request.headers.get("cf-ipcountry")
  );
}

function buildRequestId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

function shouldLogRequest(config) {
  return (
    config.runtime.requestLoggingEnabled &&
    (config.runtime.requestLogSampleRate >= 1 ||
      Math.random() <= config.runtime.requestLogSampleRate)
  );
}

function finalizeResponse(response, { request, requestId, viewerGeo, shouldLog, hasSessionCookie }) {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  response.headers.set(VIEWER_GEO_HEADER, viewerGeo);
  response.cookies.set(GEO_COOKIE_NAME, viewerGeo, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  if (shouldLog) {
    console.info(
      `[request] ${requestId} ${request.method} ${request.nextUrl.pathname} status=${response.status} geo=${viewerGeo} session=${hasSessionCookie ? "yes" : "no"}`
    );
  }

  return response;
}

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const platformConfig = getPlatformBootstrapConfig();
  const requestId = buildRequestId();
  const viewerGeo = getGeoForRequest(request);
  const logThisRequest = shouldLogRequest(platformConfig);
  const hasSessionCookie = Boolean(request.cookies.get("sports_session")?.value);
  const requiresAuth =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/editor") ||
    pathname.startsWith("/api/profile") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/favorites") ||
    pathname.startsWith("/api/protected");

  if (!hasSessionCookie && requiresAuth) {
    if (pathname.startsWith("/api/")) {
      return finalizeResponse(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        {
          request,
          requestId,
          viewerGeo,
          shouldLog: logThisRequest,
          hasSessionCookie,
        }
      );
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${getLocaleForRequest(request)}`;
    redirectUrl.searchParams.set("auth", "required");
    return finalizeResponse(NextResponse.redirect(redirectUrl), {
      request,
      requestId,
      viewerGeo,
      shouldLog: logThisRequest,
      hasSessionCookie,
    });
  }

  const isAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".");

  if (!isAsset && pathname !== "/" && !hasLocalePrefix(pathname) && !pathname.startsWith("/profile")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${getLocaleForRequest(request)}${pathname}`;
    return finalizeResponse(NextResponse.redirect(redirectUrl), {
      request,
      requestId,
      viewerGeo,
      shouldLog: logThisRequest,
      hasSessionCookie,
    });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);
  requestHeaders.set(VIEWER_GEO_HEADER, viewerGeo);

  return finalizeResponse(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
    {
      request,
      requestId,
      viewerGeo,
      shouldLog: logThisRequest,
      hasSessionCookie,
    }
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
