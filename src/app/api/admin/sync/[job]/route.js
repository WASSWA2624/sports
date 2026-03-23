import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../lib/admin-auth";
import { getCoreDataRevalidationTags } from "../../../../../lib/control-plane";
import { runSyncJob, syncJobRegistry } from "../../../../../lib/sync/jobs";
import { logAuditEvent } from "../../../../../lib/audit";
import { revalidateTagsWithAudit } from "../../../../../lib/cache";

export async function POST(request, { params }) {
  const { error, auditContext } = await requireAdminAccess(request, { stepUp: true });
  if (error) {
    return error;
  }

  const { job } = await params;
  if (!syncJobRegistry[job]) {
    return NextResponse.json({ error: "Unknown sync job." }, { status: 404 });
  }

  try {
    await logAuditEvent({
      ...auditContext,
      action: "admin.sync.triggered",
      entityType: "SyncJob",
      entityId: job,
      metadata: {
        bucket: syncJobRegistry[job].bucket,
      },
    });
    const result = await runSyncJob(job);
    await revalidateTagsWithAudit(getCoreDataRevalidationTags(), {
      ...auditContext,
      source: "sync-job-complete",
      metadata: {
        job,
      },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (syncError) {
    await logAuditEvent({
      ...auditContext,
      action: "admin.sync.failed",
      entityType: "SyncJob",
      entityId: job,
      metadata: {
        error: syncError instanceof Error ? syncError.message : String(syncError),
      },
    });
    return NextResponse.json(
      {
        ok: false,
        error: syncError instanceof Error ? syncError.message : "Sync failed.",
      },
      { status: 500 }
    );
  }
}
