import { NextResponse } from "next/server";
import {
  requireAuthenticatedUser,
  requireRoles,
} from "../../../../lib/auth";
import {
  getEditorialNewsWorkspace,
  getPublishedNewsFeed,
} from "../../../../lib/coreui/news-read";
import { createNewsArticle } from "../../../../lib/coreui/news-write";

export async function GET(request) {
  const includeDrafts = request.nextUrl.searchParams.get("includeDrafts") === "1";
  const limit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "12", 10);

  if (includeDrafts) {
    const { error, userContext } = await requireAuthenticatedUser(request);
    if (error) {
      return error;
    }

    const roleError = requireRoles(userContext, ["EDITOR", "ADMIN"]);
    if (roleError) {
      return roleError;
    }

    const workspace = await getEditorialNewsWorkspace();
    return NextResponse.json(workspace);
  }

  const items = await getPublishedNewsFeed(
    Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 24) : 12
  );
  return NextResponse.json({ items });
}

export async function POST(request) {
  try {
    const { error, userContext } = await requireAuthenticatedUser(request);
    if (error) {
      return error;
    }

    const roleError = requireRoles(userContext, ["EDITOR", "ADMIN"]);
    if (roleError) {
      return roleError;
    }

    const article = await createNewsArticle(await request.json(), userContext.user.id);
    return NextResponse.json({ ok: true, article }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create article." },
      { status: 400 }
    );
  }
}
