import { NextResponse } from "next/server";
import { issueStepUpToken } from "../../../../lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    return issueStepUpToken(request, body);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Step-up verification failed." },
      { status: 400 },
    );
  }
}
