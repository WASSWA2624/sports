import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../lib/admin-auth";
import { updateOpsIssue } from "../../../../../lib/control-plane";

export async function PATCH(request, { params }) {
  const { error, auditContext } = await requireAdminAccess(request);
  if (error) {
    return error;
  }

  try {
    const { issueId } = await params;
    const issue = await updateOpsIssue(issueId, await request.json(), auditContext);
    return NextResponse.json({ ok: true, issue });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update operations issue." },
      { status: 400 }
    );
  }
}

