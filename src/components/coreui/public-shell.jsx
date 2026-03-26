"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import styles from "./public-shell.module.css";

function getSelectedStatus(searchParams) {
  return String(searchParams?.get("status") || "all").trim().toLowerCase();
}

function buildShellNav(locale) {
  return [
    {
      key: "matches",
      label: "All",
      icon: "A",
      href: `/${locale}`,
      isActive(pathname, searchParams) {
        return pathname === `/${locale}` && !["live", "scheduled", "finished"].includes(getSelectedStatus(searchParams));
      },
    },
    {
      key: "live",
      label: "Live",
      icon: "L",
      href: `/${locale}?status=live`,
      isActive(pathname, searchParams) {
        return pathname === `/${locale}` && String(searchParams?.get("status") || "").toLowerCase() === "live";
      },
    },
    {
      key: "upcoming",
      label: "Fixtures",
      icon: "F",
      href: `/${locale}?status=scheduled`,
      isActive(pathname, searchParams) {
        return pathname === `/${locale}` && String(searchParams?.get("status") || "").toLowerCase() === "scheduled";
      },
    },
    {
      key: "results",
      label: "Results",
      icon: "R",
      href: `/${locale}?status=finished`,
      isActive(pathname, searchParams) {
        return pathname === `/${locale}` && String(searchParams?.get("status") || "").toLowerCase() === "finished";
      },
    },
    {
      key: "leagues",
      label: "Leagues",
      icon: "G",
      href: `/${locale}/leagues`,
      isActive(pathname) {
        return pathname === `/${locale}/leagues` || pathname.startsWith(`/${locale}/leagues/`);
      },
    },
  ];
}

function ShellFrame({ children, locale, dictionary, pathname = "", searchParams = null }) {
  const navItems = buildShellNav(locale);
  const activeNavItem = navItems.find((item) => item.isActive(pathname, searchParams)) || navItems[0];

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerTop}>
            <Link href={`/${locale}`} className={styles.brandLink}>
              <span className={styles.brandMark} aria-hidden="true">
                RS
              </span>
              <span className={styles.brandBlock}>
                <strong className={styles.brandTitle}>{dictionary.brand}</strong>
                <span className={styles.brandTag}>{dictionary.brandTag || "Live match center"}</span>
              </span>
            </Link>

            <div className={styles.headerUtility}>
              <span className={styles.headerUtilityChip}>
                <span className={styles.headerUtilityDot} aria-hidden="true" />
                Matchday
              </span>
            </div>
          </div>

          <nav className={styles.nav} aria-label="Primary">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={item.isActive(pathname, searchParams) ? styles.navLinkActive : styles.navLink}
              >
                <span className={styles.navIcon} aria-hidden="true">
                  {item.icon}
                </span>
                <span className={styles.navText}>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className={styles.content}>{children}</main>
    </div>
  );
}

function HookedShellFrame(props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return <ShellFrame {...props} pathname={pathname} searchParams={searchParams} />;
}

export function PublicShell(props) {
  return (
    <Suspense fallback={<ShellFrame {...props} />}>
      <HookedShellFrame {...props} />
    </Suspense>
  );
}
