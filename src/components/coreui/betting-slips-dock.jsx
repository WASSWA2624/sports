"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShellIcon } from "./shell-icons";
import styles from "./betting-slips-dock.module.css";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../../lib/coreui/preferences";

function getRouteLocale(pathname, defaultLocale) {
  const segment = String(pathname || "")
    .split("/")
    .filter(Boolean)[0];

  if (SUPPORTED_LOCALES.includes(segment)) {
    return segment;
  }

  return SUPPORTED_LOCALES.includes(defaultLocale) ? defaultLocale : DEFAULT_LOCALE;
}

export function BettingSlipsDock({ defaultLocale = DEFAULT_LOCALE, dictionary }) {
  const pathname = usePathname();
  const locale = getRouteLocale(pathname, defaultLocale);
  const predictionsHref = `/${locale}/predictions`;
  const createSlipHref = `${predictionsHref}#slip-composer`;
  const isPredictionsPage =
    pathname === predictionsHref || pathname.startsWith(`${predictionsHref}/`);

  return (
    <div className={styles.dock}>
      <nav className={styles.dockInner} aria-label={dictionary.bettingSlips}>
        <Link
          href={predictionsHref}
          className={isPredictionsPage ? `${styles.action} ${styles.actionActive}` : styles.action}
        >
          <span className={styles.actionContent}>
            <ShellIcon name="slips" className={styles.icon} />
            <span>{dictionary.bettingSlips}</span>
          </span>
        </Link>

        <Link href={createSlipHref} className={styles.createAction}>
          <span className={styles.actionContent}>
            <ShellIcon name="slips" className={styles.icon} />
            <span>{dictionary.createSlip}</span>
          </span>
        </Link>
      </nav>
    </div>
  );
}
