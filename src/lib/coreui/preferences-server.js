import { cookies } from "next/headers";
import {
  LOCALE_COOKIE_NAME,
  normalizeLocale,
} from "./preferences";

export async function getPreferredLocale() {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}
