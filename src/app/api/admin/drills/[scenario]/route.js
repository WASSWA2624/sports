import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../../lib/admin-auth";
import { runFailureDrill } from "../../../../../../lib/operations";

export async function POST(request, { params }) {
  const { error } = await requireAdminAccess(request, { stepUp: true });
  if (error) {
    return error;
  }

  try {
    const { scenario } = await params;
    const result = await runFailureDrill(scenario);
    return NextResponse.json({ ok: true, result });
  } catch (drillError) {
    return NextResponse.json(
      {
        ok: false,
        error: drillError instanceof Error ? drillError.message : "Failed to run drill.",
      },
      { status: 400 }
    );
  }
}
