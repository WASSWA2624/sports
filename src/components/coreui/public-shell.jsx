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
      href: `/${locale}`,
      isActive(pathname, searchParams) {
        return pathname === `/${locale}` && !["live", "scheduled", "finished"].includes(getSelectedStatus(searchParams));
      },
    },
    {
      key: "live",
      label: "Live",
      href: `/${locale}?status=live`,
      isActive(pathname, searchParams) {
        return pathname === `/${locale}` && String(searchParams?.get("status") || "").toLowerCase() === "live";
      },
    },
    {
      key: "upcoming",
      label: "Fixtures",
      href: `/${locale}?status=scheduled`,
      isActive(pathname, searchParams) {
        return pathname === `/${locale}` && String(searchParams?.get("status") || "").toLowerCase() === "scheduled";
      },
    },
    {
      key: "results",
      label: "Results",
      href: `/${locale}?status=finished`,
      isActive(pathname, searchParams) {
        return pathname === `/${locale}` && String(searchParams?.get("status") || "").toLowerCase() === "finished";
      },
    },
    {
      key: "leagues",
      label: "Leagues",
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
                SP
              </span>
              <span className={styles.brandBlock}>
                <span className={styles.brandTag}>{dictionary.brandTag || "Live match center"}</span>
                <strong className={styles.brandTitle}>{dictionary.brand}</strong>
              </span>
            </Link>

            <div className={styles.headerUtility}>
              <span className={styles.headerUtilityChip}>
                <span className={styles.headerUtilityDot} aria-hidden="true" />
                Matchday
              </span>

              <details className={styles.mobileNavMenu}>
                <summary className={styles.mobileNavToggle}>
                  <span className={styles.mobileNavLabel}>Browse</span>
                  <strong>{activeNavItem.label}</strong>
                </summary>

                <nav className={styles.mobileNavPanel} aria-label="Primary menu">
                  {navItems.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={
                        item.isActive(pathname, searchParams) ? styles.mobileNavLinkActive : styles.mobileNavLink
                      }
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </details>
            </div>
          </div>

          <nav className={styles.nav} aria-label="Primary">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={item.isActive(pathname, searchParams) ? styles.navLinkActive : styles.navLink}
              >
                {item.label}
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
