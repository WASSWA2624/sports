import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../lib/admin-auth";
import { getControlPlaneWorkspace } from "../../../../lib/control-plane";

export async function GET(request) {
  const { error } = await requireAdminAccess(request);
  if (error) {
    return error;
  }

  try {
    const workspace = await getControlPlaneWorkspace();
    return NextResponse.json(workspace);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load control plane workspace." },
      { status: 500 }
    );
  }
}
