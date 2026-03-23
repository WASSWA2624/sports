import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "../../../../lib/auth";

export async function GET(request) {
  const userContext = await getCurrentUserFromRequest(request);
  if (!userContext) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: userContext.user.id,
      email: userContext.user.email,
      username: userContext.user.username,
      displayName: userContext.user.displayName,
      roles: userContext.roles,
    },
  });
}
