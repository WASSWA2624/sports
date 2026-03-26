"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import styles from "./public-shell.module.css";

function getSelectedStatus(searchParams) {
  return String(searchParams?.get("status") || "all").trim().toLowerCase();
}

function NavIcon({ name }) {
  const commonProps = {
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (name === "matches") {
    return (
      <svg {...commonProps}>
        <circle cx="8" cy="8" r="5.25" />
        <path d="M8 2.75v10.5M2.75 8h10.5" />
      </svg>
    );
  }

  if (name === "live") {
    return (
      <svg {...commonProps}>
        <path d="M3 8a5 5 0 0 1 10 0" />
        <path d="M5 8a3 3 0 0 1 6 0" />
        <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (name === "upcoming") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="4" width="10" height="9" rx="1.8" />
        <path d="M5.5 2.75v2.1M10.5 2.75v2.1M3 6.5h10" />
      </svg>
    );
  }

  if (name === "results") {
    return (
      <svg {...commonProps}>
        <path d="M4 8.5 6.5 11 12 5.5" />
        <circle cx="8" cy="8" r="5.25" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M3.5 5.5 8 3l4.5 2.5L8 8 3.5 5.5Z" />
      <path d="M3.5 10.5 8 8l4.5 2.5L8 13l-4.5-2.5Z" />
    </svg>
  );
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
                  <NavIcon name={item.key} />
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
