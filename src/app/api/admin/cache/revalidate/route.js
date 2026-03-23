import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../lib/admin-auth";
import { manualRevalidateCache } from "../../../../../lib/control-plane";

export async function POST(request) {
  const { error, auditContext } = await requireAdminAccess(request, { stepUp: true });
  if (error) {
    return error;
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const tags = await manualRevalidateCache(payload.tags || [], auditContext);
    return NextResponse.json({ ok: true, tags });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to revalidate cache tags." },
      { status: 400 }
    );
  }
}
