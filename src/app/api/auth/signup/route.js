import { NextResponse } from "next/server";
import { signUpWithEmailPassword, writeSessionCookie } from "../../../../lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const requestMeta = {
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    };

    const { user, session } = await signUpWithEmailPassword(body, requestMeta);
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        roles: user.roles.map((entry) => entry.role.name),
      },
    });
    return writeSessionCookie(response, session.token);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Signup failed" },
      { status: 400 },
    );
  }
}
