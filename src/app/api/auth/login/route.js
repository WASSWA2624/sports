import { NextResponse } from "next/server";
import { loginWithEmailPassword, writeSessionCookie } from "../../../../lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const requestMeta = {
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    };
    const result = await loginWithEmailPassword(body, requestMeta);

    if (!result) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const response = NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        displayName: result.user.displayName,
        roles: result.user.roles.map((entry) => entry.role.name),
      },
    });
    return writeSessionCookie(response, result.session.token);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Login failed" },
      { status: 400 },
    );
  }
}
