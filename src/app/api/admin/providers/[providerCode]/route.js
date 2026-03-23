import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../lib/admin-auth";
import { updateSourceProviderControl } from "../../../../../lib/control-plane";

export async function PATCH(request, { params }) {
  const { error, auditContext } = await requireAdminAccess(request, { stepUp: true });
  if (error) {
    return error;
  }

  try {
    const { providerCode } = await params;
    const provider = await updateSourceProviderControl(
      providerCode,
      await request.json(),
      auditContext
    );
    return NextResponse.json({ ok: true, provider });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update provider control." },
      { status: 400 }
    );
  }
}

