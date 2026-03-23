import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../lib/admin-auth";
import { updateAdSlotControl } from "../../../../../lib/control-plane";

export async function PATCH(request, { params }) {
  const { error, auditContext } = await requireAdminAccess(request, { stepUp: true });
  if (error) {
    return error;
  }

  try {
    const { slotKey } = await params;
    const adSlot = await updateAdSlotControl(slotKey, await request.json(), auditContext);
    return NextResponse.json({ ok: true, adSlot });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update ad slot." },
      { status: 400 }
    );
  }
}

