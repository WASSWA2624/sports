import { NextResponse } from "next/server";
import { requireEditorAccess } from "../../../../lib/admin-auth";
import { createOpsIssue } from "../../../../lib/control-plane";

export async function POST(request) {
  const { error, auditContext } = await requireEditorAccess(request);
  if (error) {
    return error;
  }

  try {
    const issue = await createOpsIssue(await request.json(), auditContext);
    return NextResponse.json({ ok: true, issue }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create operations issue." },
      { status: 400 }
    );
  }
}

