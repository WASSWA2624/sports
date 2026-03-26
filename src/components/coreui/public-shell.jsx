"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PreferencesProvider } from "./preferences-provider";
import styles from "./public-shell.module.css";

function buildShellNav(locale) {
  return [
    {
      key: "matches",
      label: "Matches",
      href: `/${locale}`,
      isActive(pathname, searchParams) {
        const status = String(searchParams?.get("status") || "").toLowerCase();
        return pathname === `/${locale}` && !status;
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

function SidebarSection({ title, action, children }) {
  return (
    <section className={styles.sidebarSection}>
      <div className={styles.sidebarHead}>
        <h2 className={styles.sidebarTitle}>{title}</h2>
        {action}
      </div>
      <div className={styles.sidebarBody}>{children}</div>
    </section>
  );
}

function ShellFrame({ children, locale, dictionary, shellData }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navItems = buildShellNav(locale);
  const topCompetitions = shellData?.featuredCompetitions || [];
  const countryGroups = shellData?.countryGroups || [];

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandWrap}>
            <Link href={`/${locale}`} className={styles.brandLink}>
              <span className={styles.brandMark} aria-hidden="true">
                SP
              </span>
              <span className={styles.brandBlock}>
                <strong className={styles.brandTitle}>{dictionary.brand}</strong>
                <span className={styles.brandTag}>Football-only scores and results</span>
              </span>
            </Link>
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

          <div className={styles.headerMeta}>
            <span className={styles.metaChip}>Football</span>
            <span className={styles.metaChip}>{locale.toUpperCase()}</span>
          </div>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <SidebarSection
            title="Top Leagues"
            action={
              <Link href={`/${locale}/leagues`} className={styles.sidebarAction}>
                All
              </Link>
            }
          >
            <div className={styles.linkStack}>
              {topCompetitions.length ? (
                topCompetitions.map((competition) => {
                  const href = `/${locale}/leagues/${competition.code}`;
                  const isActive =
                    pathname === href ||
                    pathname.startsWith(`${href}?`) ||
                    pathname.startsWith(`${href}/`);

                  return (
                    <Link
                      key={competition.code}
                      href={href}
                      className={isActive ? styles.sidebarLinkActive : styles.sidebarLink}
                    >
                      <span className={styles.sidebarLinkCopy}>
                        <strong>{competition.name}</strong>
                        <span>{competition.country || dictionary.international}</span>
                      </span>
                    </Link>
                  );
                })
              ) : (
                <p className={styles.emptyCopy}>Leagues will appear here once football data is available.</p>
              )}
            </div>
          </SidebarSection>

          <SidebarSection title="Countries">
            <div className={styles.countryGrid}>
              {countryGroups.length ? (
                countryGroups.slice(0, 10).map((group) => (
                  <div key={group.country || group.countryCode || "country"} className={styles.countryCard}>
                    <strong>{group.country || dictionary.international}</strong>
                    <span>{group.leagues.length} leagues</span>
                  </div>
                ))
              ) : (
                <p className={styles.emptyCopy}>Country groupings will appear here when provider catalog data is ready.</p>
              )}
            </div>
          </SidebarSection>
        </aside>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

export function PublicShell({
  children,
  locale,
  viewerGeo,
  dictionary,
  initialTheme,
  initialWatchlist,
  initialAlertSettings,
  initialRecentViews,
  initialFavoriteSports,
  initialTimezone,
  initialPromptPreferences,
  initialMarketPreferences,
  initialOnboardingState,
  shellData,
}) {
  return (
    <PreferencesProvider
      initialLocale={locale}
      initialTheme={initialTheme}
      initialWatchlist={initialWatchlist}
      initialAlertSettings={initialAlertSettings}
      initialRecentViews={initialRecentViews}
      initialFavoriteSports={initialFavoriteSports}
      initialTimezone={initialTimezone}
      initialPromptPreferences={initialPromptPreferences}
      initialMarketPreferences={initialMarketPreferences}
      initialOnboardingState={initialOnboardingState}
      initialViewerGeo={viewerGeo}
    >
      <ShellFrame locale={locale} dictionary={dictionary} shellData={shellData}>
        {children}
      </ShellFrame>
    </PreferencesProvider>
  );
}
