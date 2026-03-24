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

const ACCESS_COOKIE_NAME = "sports_access";

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

function stripLocalePrefix(pathname) {
  const segments = pathname.split("/").filter(Boolean);

  if (!segments.length || !SUPPORTED_LOCALES.includes(segments[0])) {
    return pathname;
  }

  const remaining = segments.slice(1);
  return remaining.length ? `/${remaining.join("/")}` : "/";
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return atob(`${normalized}${padding}`);
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

function getAuthSecret() {
  return process.env.AUTH_SECRET || "local-dev-secret";
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((entry) => entry.toString(16).padStart(2, "0"))
    .join("");
}

async function signProxyPayload(payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

async function getAccessContext(request) {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  try {
    const payloadRaw = decodeBase64Url(encodedPayload);
    const expectedSignature = await signProxyPayload(payloadRaw);

    if (signature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(payloadRaw);
    if (!payload?.userId || !Array.isArray(payload?.roles) || Date.now() > Number(payload?.exp || 0)) {
      return null;
    }

    return {
      userId: payload.userId,
      roles: payload.roles.map((role) => String(role || "").toUpperCase()),
    };
  } catch (error) {
    return null;
  }
}

function hasAnyRole(accessContext, allowedRoles = []) {
  return allowedRoles.some((role) => accessContext.roles.includes(String(role || "").toUpperCase()));
}

function getProtectedPageRule(pathname) {
  if (pathname === "/profile" || pathname.startsWith("/profile/")) {
    return { requiresAuth: true };
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return {
      requiresAuth: true,
      allowedRoles: ["ADMIN"],
    };
  }

  if (pathname === "/editor" || pathname.startsWith("/editor/")) {
    return {
      requiresAuth: true,
      allowedRoles: ["EDITOR", "ADMIN"],
    };
  }

  if (pathname === "/news/manage" || pathname.startsWith("/news/manage/")) {
    return {
      requiresAuth: true,
      allowedRoles: ["EDITOR", "ADMIN"],
    };
  }

  return null;
}

function buildAuthRedirectUrl(request, locale, reason = "required") {
  const redirectUrl = request.nextUrl.clone();
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  redirectUrl.pathname = `/${locale}/auth`;
  redirectUrl.searchParams.set("next", nextPath);
  redirectUrl.searchParams.set("reason", reason);
  return redirectUrl;
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

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const platformConfig = getPlatformBootstrapConfig();
  const requestId = buildRequestId();
  const viewerGeo = getGeoForRequest(request);
  const logThisRequest = shouldLogRequest(platformConfig);
  const requestLocale = getLocaleForRequest(request);
  const hasSessionCookie = Boolean(request.cookies.get("sports_session")?.value);
  const normalizedPagePath = stripLocalePrefix(pathname);
  const protectedPageRule = getProtectedPageRule(normalizedPagePath);
  const requiresAuth =
    Boolean(protectedPageRule) ||
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

    const redirectUrl = buildAuthRedirectUrl(request, requestLocale);
    return finalizeResponse(NextResponse.redirect(redirectUrl), {
      request,
      requestId,
      viewerGeo,
      shouldLog: logThisRequest,
      hasSessionCookie,
    });
  }

  if (hasSessionCookie && protectedPageRule?.allowedRoles?.length) {
    const accessContext = await getAccessContext(request);

    if (accessContext && !hasAnyRole(accessContext, protectedPageRule.allowedRoles)) {
      if (pathname.startsWith("/api/")) {
        return finalizeResponse(
          NextResponse.json({ error: "Forbidden" }, { status: 403 }),
          {
            request,
            requestId,
            viewerGeo,
            shouldLog: logThisRequest,
            hasSessionCookie,
          }
        );
      }

      const redirectUrl = buildAuthRedirectUrl(request, requestLocale, "forbidden");
      redirectUrl.searchParams.set("requiredRole", protectedPageRule.allowedRoles.join(","));
      return finalizeResponse(NextResponse.redirect(redirectUrl), {
        request,
        requestId,
        viewerGeo,
        shouldLog: logThisRequest,
        hasSessionCookie,
      });
    }
  }

  const isAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".");

  if (!isAsset && pathname !== "/" && !hasLocalePrefix(pathname) && !pathname.startsWith("/profile")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${requestLocale}${pathname}`;
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
