import { NextResponse } from "next/server";
import { z } from "zod";

const providerSchema = z.enum(["google"]);

function isProviderConfigured(provider) {
  if (provider === "google") {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }
  return false;
}

export async function GET(_request, { params }) {
  const parsed = providerSchema.safeParse(params.provider);
  if (!parsed.success) {
    return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  }

  const provider = parsed.data;
  const enabled = isProviderConfigured(provider);
  return NextResponse.json({
    provider,
    enabled,
    message: enabled
      ? "Provider is configured. Integrate OAuth callback flow in next phase."
      : "Provider disabled via environment variables.",
  });
}
