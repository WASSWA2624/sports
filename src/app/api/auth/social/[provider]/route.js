import { NextResponse } from "next/server";
import { getSocialAuthProvider } from "../../../../../lib/social-auth";

export async function GET(_request, { params }) {
  const provider = getSocialAuthProvider(params.provider);

  if (!provider) {
    return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  }

  return NextResponse.json({
    provider: provider.key,
    label: provider.label,
    enabled: provider.enabled,
    message: provider.enabled
      ? "Provider is configured. Complete the OAuth callback flow in the next auth iteration."
      : "Provider disabled via environment variables.",
  });
}
