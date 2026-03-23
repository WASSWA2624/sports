import { redirect } from "next/navigation";
import { getPreferredLocale } from "../lib/coreui/preferences-server";

export default async function RootPage() {
  redirect(`/${await getPreferredLocale()}`);
}
