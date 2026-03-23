import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../lib/admin-auth";
import { updateShellModuleControl } from "../../../../../lib/control-plane";

export async function PATCH(request, { params }) {
  const { error, auditContext } = await requireAdminAccess(request, { stepUp: true });
  if (error) {
    return error;
  }

  try {
    const { moduleKey } = await params;
    const module = await updateShellModuleControl(
      moduleKey,
      await request.json(),
      auditContext
    );
    return NextResponse.json({ ok: true, module });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update shell module control." },
      { status: 400 }
    );
  }
}

