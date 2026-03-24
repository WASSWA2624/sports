import { NextResponse } from "next/server";
import { requireEditorAccess } from "../../../../../lib/admin-auth";
import { updatePredictionRecommendationControl } from "../../../../../lib/control-plane";

export async function PATCH(request, { params }) {
  const { error, auditContext } = await requireEditorAccess(request);
  if (error) {
    return error;
  }

  try {
    const { recommendationKey } = await params;
    const recommendation = await updatePredictionRecommendationControl(
      recommendationKey,
      await request.json(),
      auditContext
    );
    return NextResponse.json({ ok: true, recommendation });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update prediction recommendation." },
      { status: 400 }
    );
  }
}
