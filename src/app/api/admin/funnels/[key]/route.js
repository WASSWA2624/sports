import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../lib/admin-auth";
import { updateFunnelEntryControl } from "../../../../../lib/control-plane";

export async function PATCH(request, { params }) {
  const { error, auditContext } = await requireAdminAccess(request, { stepUp: true });
  if (error) {
    return error;
  }

  try {
    const { key } = await params;
    const funnelEntry = await updateFunnelEntryControl(key, await request.json(), auditContext);
    return NextResponse.json({ ok: true, funnelEntry });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update funnel entry control." },
      { status: 400 }
    );
  }
}
