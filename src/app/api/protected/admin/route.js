import { NextResponse } from "next/server";
import { requireAuthenticatedUser, requireRoles } from "../../../../lib/auth";

export async function GET(request) {
  const { error, userContext } = await requireAuthenticatedUser(request);
  if (error) {
    return error;
  }

  const roleError = requireRoles(userContext, ["ADMIN"]);
  if (roleError) {
    return roleError;
  }

  return NextResponse.json({ ok: true, scope: "admin" });
}
