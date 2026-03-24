import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../lib/admin-auth";
import { updateAffiliateLinkControl } from "../../../../../lib/control-plane";

export async function PATCH(request, { params }) {
  const { error, auditContext } = await requireAdminAccess(request, { stepUp: true });
  if (error) {
    return error;
  }

  try {
    const { key } = await params;
    const affiliateLink = await updateAffiliateLinkControl(
      key,
      await request.json(),
      auditContext
    );
    return NextResponse.json({ ok: true, affiliateLink });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update affiliate link control." },
      { status: 400 }
    );
  }
}
