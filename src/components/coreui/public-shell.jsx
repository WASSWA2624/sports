"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import styles from "./public-shell.module.css";

function buildShellNav(locale) {
  return [
    {
      key: "matches",
      label: "Matches",
      href: `/${locale}`,
      isActive(pathname) {
        return pathname === `/${locale}`;
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
      label: "Upcoming",
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

function ShellFrame({ children, locale, dictionary, shellData, pathname = "", searchParams = null }) {
  const navItems = buildShellNav(locale);
  const topCompetitions = shellData?.featuredCompetitions || [];
  const countryGroups = shellData?.countryGroups || [];

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href={`/${locale}`} className={styles.brandLink}>
            <span className={styles.brandMark} aria-hidden="true">
              SP
            </span>
            <span className={styles.brandBlock}>
              <strong className={styles.brandTitle}>{dictionary.brand}</strong>
              <span className={styles.brandTag}>Live scores, upcoming matches, and results</span>
            </span>
          </Link>

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

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <section className={styles.sidebarSection}>
            <div className={styles.sidebarHead}>
              <h2 className={styles.sidebarTitle}>Leagues</h2>
              <Link href={`/${locale}/leagues`} className={styles.sidebarAction}>
                All
              </Link>
            </div>
            <div className={styles.sidebarBody}>
              <div className={styles.linkStack}>
                {topCompetitions.map((competition) => (
                  <Link
                    key={competition.code}
                    href={`/${locale}/leagues/${competition.code}`}
                    className={
                      pathname === `/${locale}/leagues/${competition.code}`
                        ? styles.sidebarLinkActive
                        : styles.sidebarLink
                    }
                  >
                    <span className={styles.sidebarLinkCopy}>
                      <strong>{competition.name}</strong>
                      <span>{competition.country}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.sidebarSection}>
            <div className={styles.sidebarHead}>
              <h2 className={styles.sidebarTitle}>Countries</h2>
            </div>
            <div className={styles.sidebarBody}>
              <div className={styles.countryGrid}>
                {countryGroups.map((group) => (
                  <div key={group.country} className={styles.countryCard}>
                    <strong>{group.country}</strong>
                    <span>{group.leagues.length} leagues</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </aside>

        <main className={styles.content}>{children}</main>
      </div>
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
