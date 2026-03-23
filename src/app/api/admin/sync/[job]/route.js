import { NextResponse } from "next/server";
import { requireAuthenticatedUser, requireRoles } from "../../../../../lib/auth";
import { runSyncJob, syncJobRegistry } from "../../../../../lib/sync/jobs";

export async function POST(request, { params }) {
  const { error, userContext } = await requireAuthenticatedUser(request);
  if (error) {
    return error;
  }

  const roleError = requireRoles(userContext, ["ADMIN"]);
  if (roleError) {
    return roleError;
  }

  const { job } = params;
  if (!syncJobRegistry[job]) {
    return NextResponse.json({ error: "Unknown sync job." }, { status: 404 });
  }

  try {
    const result = await runSyncJob(job);
    return NextResponse.json({ ok: true, ...result });
  } catch (syncError) {
    return NextResponse.json(
      {
        ok: false,
        error: syncError instanceof Error ? syncError.message : "Sync failed.",
      },
      { status: 500 }
    );
  }
}
