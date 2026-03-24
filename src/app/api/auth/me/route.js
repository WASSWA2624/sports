import { NextResponse } from "next/server";
import {
  getCurrentUserFromRequest,
  toSessionUserPayload,
  writeAccessCookie,
} from "../../../../lib/auth";

export async function GET(request) {
  const userContext = await getCurrentUserFromRequest(request);
  if (!userContext) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const response = NextResponse.json({
    user: toSessionUserPayload(userContext),
  });

  return writeAccessCookie(response, userContext);
}
