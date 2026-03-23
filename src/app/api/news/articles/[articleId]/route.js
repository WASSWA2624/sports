import { NextResponse } from "next/server";
import {
  requireAuthenticatedUser,
  requireRoles,
} from "../../../../../lib/auth";
import {
  archiveNewsArticle,
  updateNewsArticle,
} from "../../../../../lib/coreui/news-write";

export async function PATCH(request, { params }) {
  try {
    const { error, userContext } = await requireAuthenticatedUser(request);
    if (error) {
      return error;
    }

    const roleError = requireRoles(userContext, ["EDITOR", "ADMIN"]);
    if (roleError) {
      return roleError;
    }

    const { articleId } = await params;
    const article = await updateNewsArticle(articleId, await request.json(), userContext.user.id);
    return NextResponse.json({ ok: true, article });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update article." },
      { status: 400 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { error, userContext } = await requireAuthenticatedUser(request);
    if (error) {
      return error;
    }

    const roleError = requireRoles(userContext, ["EDITOR", "ADMIN"]);
    if (roleError) {
      return roleError;
    }

    const { articleId } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await archiveNewsArticle(articleId, userContext.user.id, body?.note);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to archive article." },
      { status: 400 }
    );
  }
}
