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

function ShellFrame({ children, locale, dictionary, shellData, pathname = "", searchParams = null }) {
  const navItems = buildShellNav(locale);
  const topCompetitions = (shellData?.featuredCompetitions || []).slice(0, 6);

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
              <span className={styles.brandTag}>Football only</span>
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

        <section className={styles.leagueRail} aria-label="Top leagues">
          <div className={styles.leagueRailHead}>
            <div>
              <p className={styles.leagueRailEyebrow}>Competitions</p>
              <h2 className={styles.leagueRailTitle}>Top football leagues</h2>
            </div>
            <Link href={`/${locale}/leagues`} className={styles.leagueRailAction}>
              All leagues
            </Link>
          </div>

          <div className={styles.leagueStrip}>
            {topCompetitions.map((competition) => (
              <Link
                key={competition.code}
                href={`/${locale}/leagues/${competition.code}`}
                className={
                  pathname === `/${locale}/leagues/${competition.code}`
                    ? styles.leagueChipActive
                    : styles.leagueChip
                }
              >
                <strong>{competition.name}</strong>
                <span>{competition.country}</span>
              </Link>
            ))}
          </div>
        </section>
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
