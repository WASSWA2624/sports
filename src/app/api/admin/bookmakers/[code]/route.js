import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../lib/admin-auth";
import { updateBookmakerControl } from "../../../../../lib/control-plane";

export async function PATCH(request, { params }) {
  const { error, auditContext } = await requireAdminAccess(request, { stepUp: true });
  if (error) {
    return error;
  }

  try {
    const { code } = await params;
    const bookmaker = await updateBookmakerControl(code, await request.json(), auditContext);
    return NextResponse.json({ ok: true, bookmaker });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update bookmaker control." },
      { status: 400 }
    );
  }
}
