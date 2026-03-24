import { NextResponse } from "next/server";
import {
  signUpWithEmailPassword,
  toSessionUserPayload,
  writeSessionCookie,
} from "../../../../lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const requestMeta = {
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    };

    const { user, session } = await signUpWithEmailPassword(body, requestMeta);
    const response = NextResponse.json({
      user: toSessionUserPayload({
        user,
        roles: user.roles.map((entry) => entry.role.name),
      }),
    });
    return writeSessionCookie(response, session.token, {
      user,
      roles: user.roles.map((entry) => entry.role.name),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Signup failed" },
      { status: 400 },
    );
  }
}
