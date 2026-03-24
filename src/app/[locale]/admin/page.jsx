import { getCurrentUserFromServer } from "../../../lib/auth";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { safeDataRead } from "../../../lib/data-access";
import { getControlPlaneWorkspace } from "../../../lib/control-plane";
import sharedStyles from "../../../components/coreui/styles.module.css";
import AdminConsoleClient from "./admin-console-client";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildPageMetadata(
    locale,
    "Admin Control Room",
    "Operational dashboard for admin controls, editorial safety, and platform health.",
    "/admin"
  );
}

export default async function AdminPage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const userContext = await safeDataRead(() => getCurrentUserFromServer(), null, {
    label: "Admin session lookup",
  });
  const canAdmin = userContext?.roles?.includes("ADMIN");

  if (!canAdmin) {
    return (
      <section className={sharedStyles.section}>
        <header className={sharedStyles.pageHeader}>
          <div>
            <p className={sharedStyles.eyebrow}>Admin</p>
            <h1 className={sharedStyles.pageTitle}>Admin Control Room</h1>
            <p className={sharedStyles.pageLead}>
              Administrator access is required to operate the control plane.
            </p>
          </div>
        </header>
      </section>
    );
  }

  const workspace = await getControlPlaneWorkspace();

  return (
    <AdminConsoleClient
      locale={locale}
      dictionary={dictionary}
      initialWorkspace={workspace}
    />
  );
}
