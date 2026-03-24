import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../lib/admin-auth";
import { updateMonetizationPlacementControl } from "../../../../../lib/control-plane";

export async function PATCH(request, { params }) {
  const { error, auditContext } = await requireAdminAccess(request, { stepUp: true });
  if (error) {
    return error;
  }

  try {
    const { key } = await params;
    const placement = await updateMonetizationPlacementControl(
      key,
      await request.json(),
      auditContext
    );
    return NextResponse.json({ ok: true, placement });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update monetization placement." },
      { status: 400 }
    );
  }
}
