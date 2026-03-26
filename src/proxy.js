import { NextResponse } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
} from "./lib/coreui/preferences";

const REQUEST_ID_HEADER = "x-sports-request-id";

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

function buildRequestId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

function finalizeResponse(response, requestId) {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const requestId = buildRequestId();
  const requestLocale = getLocaleForRequest(request);
  const isAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".");

  if (!isAsset && pathname !== "/" && !hasLocalePrefix(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${requestLocale}${pathname}`;
    return finalizeResponse(NextResponse.redirect(redirectUrl), requestId);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  return finalizeResponse(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
    requestId
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
