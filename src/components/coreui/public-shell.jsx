"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { PreferencesProvider, usePreferences } from "./preferences-provider";
import { ShellSearch } from "./shell-search";
import styles from "./styles.module.css";
import { SCORES_NAV, SPORTS_STRIP, TOP_LEVEL_NAV } from "../../lib/coreui/config";

function ShellFrame({ children, locale, dictionary, watchlistItems, shellData }) {
  const pathname = usePathname();
  const { sessionUser, watchlist, watchlistCount } = usePreferences();
  const isNewsMode = pathname === `/${locale}/news` || pathname.startsWith(`/${locale}/news/`);
  const allCompetitions = [
    ...(shellData?.featuredCompetitions || []),
    ...((shellData?.countryGroups || []).flatMap((group) =>
      group.leagues.map((league) => ({
        ...league,
        country: group.country,
      }))
    )),
  ];

  const savedCompetitions = watchlist
    .filter((itemId) => itemId.startsWith("competition:"))
    .map((itemId) => itemId.split(":")[1])
    .map((competitionCode) =>
      allCompetitions.find((competition) => competition.code === competitionCode)
    )
    .filter(Boolean);

  const savedTeams = watchlist
    .filter((itemId) => itemId.startsWith("team:"))
    .map((itemId) => itemId.split(":")[1])
    .map((teamId) =>
      (shellData?.teamDirectory || []).find((team) => team.id === teamId || team.code === teamId)
    )
    .filter(Boolean);

  const pinnedCompetitions =
    savedCompetitions.length > 0
      ? savedCompetitions
      : (shellData?.featuredCompetitions || []).slice(0, 6);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerBrand}>
            <div className={styles.brandBlock}>
              <Link href={`/${locale}`} className={styles.brand}>
                {dictionary.brand}
              </Link>
              <p className={styles.brandTag}>Live, fixtures, tables.</p>
            </div>
          </div>

          <div className={styles.headerStack}>
            <nav className={styles.topModeNav}>
              {TOP_LEVEL_NAV.map((item) => {
                const href = `/${locale}${item.href}`;
                const active =
                  item.key === "news"
                    ? isNewsMode
                    : !isNewsMode && (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));

                return (
                  <Link
                    key={item.key}
                    href={href}
                    className={active ? styles.topModeLinkActive : styles.topModeLink}
                  >
                    {item.key === "scores" ? dictionary.scores : dictionary.news}
                  </Link>
                );
              })}
            </nav>

            {!isNewsMode ? (
              <nav className={styles.nav}>
                {SCORES_NAV.map((item) => {
                  const href = `/${locale}${item.href}`;
                  const active =
                    item.href === ""
                      ? pathname === `/${locale}`
                      : pathname === href || pathname.startsWith(`${href}/`);

                  return (
                    <Link
                      key={item.key}
                      href={href}
                      className={active ? styles.navLinkActive : styles.navLink}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </div>

          <div className={styles.headerControls}>
            <ShellSearch dictionary={dictionary} locale={locale} shortcuts={shellData?.searchShortcuts || []} />
            <Link href="/profile" className={styles.sectionAction}>
              {sessionUser ? dictionary.profile : dictionary.login}
            </Link>
            <LocaleSwitcher locale={locale} label={dictionary.locale} />
            <ThemeToggle label={dictionary.theme} />
            <div className={styles.watchPill}>
              {dictionary.watchlist} {watchlistCount || watchlistItems.length}
            </div>
          </div>
        </div>

        <div className={styles.sportsStrip}>
          {SPORTS_STRIP.map((sport) =>
            sport.enabled ? (
              <Link
                key={sport.key}
                href={`/${locale}${sport.href}`}
                className={sport.key === "football" ? styles.sportsChipActive : styles.sportsChip}
              >
                {sport.label}
              </Link>
            ) : (
              <button key={sport.key} type="button" className={styles.sportsChipDisabled}>
                {sport.label}
              </button>
            )
          )}
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.shellColumns}>
          <aside className={styles.leftRail}>
            <section className={styles.railCard}>
              <div className={styles.railSection}>
                <h2 className={styles.railSectionTitle}>{dictionary.scoreViews}</h2>
                <div className={styles.railList}>
                  {SCORES_NAV.map((item) => (
                    <Link key={item.key} href={`/${locale}${item.href}`} className={styles.railLink}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            <section className={styles.railCard}>
              <div className={styles.railSection}>
                <h2 className={styles.railSectionTitle}>{dictionary.pinnedCompetitions}</h2>
                <div className={styles.railList}>
                  {pinnedCompetitions.length ? (
                    pinnedCompetitions.map((competition) => (
                      <Link
                        key={competition.code}
                        href={`/${locale}/leagues/${competition.code}`}
                        className={styles.railLink}
                      >
                        {competition.name}
                      </Link>
                    ))
                  ) : (
                    <p className={styles.railMuted}>{dictionary.watchlistEmpty}</p>
                  )}
                </div>
              </div>
            </section>

            <section className={styles.railCard}>
              <div className={styles.railSection}>
                <h2 className={styles.railSectionTitle}>{dictionary.myTeams}</h2>
                <div className={styles.railList}>
                  {savedTeams.length ? (
                    savedTeams.map((team) => (
                      <Link key={team.id} href={`/${locale}/teams/${team.id}`} className={styles.railLink}>
                        {team.name}
                      </Link>
                    ))
                  ) : (
                    <p className={styles.railMuted}>Save teams to surface them here.</p>
                  )}
                </div>
              </div>
            </section>

            <section className={styles.railCard}>
              <div className={styles.railSection}>
                <h2 className={styles.railSectionTitle}>{dictionary.countries}</h2>
                <div className={styles.railList}>
                  {(shellData?.countryGroups || []).map((group) => (
                    <div key={group.country} className={styles.railCountryRow}>
                      <strong>{group.country}</strong>
                      <span className={styles.badge}>{group.leagues.length}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </aside>

          <div className={styles.centerRail}>{children}</div>

          <aside className={styles.rightRail}>
            <section className={styles.railCard}>
              <div className={styles.railSection}>
                <h2 className={styles.railSectionTitle}>{dictionary.adSlot}</h2>
                <div className={styles.adSlot}>300 x 250 support slot</div>
              </div>
            </section>

            <section className={styles.railCard}>
              <div className={styles.railSection}>
                <h2 className={styles.railSectionTitle}>{dictionary.consent}</h2>
                <p className={styles.railMuted}>
                  Consent, privacy, and regulated-content notices land in this rail without breaking the
                  scores layout.
                </p>
              </div>
            </section>

            <section className={styles.railCard}>
              <div className={styles.railSection}>
                <h2 className={styles.railSectionTitle}>{dictionary.supportRail}</h2>
                <p className={styles.railMuted}>
                  Right-rail modules stay optional so the main scores board remains readable when ads are
                  unavailable.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p>Live, fixtures, results, tables, leagues, teams.</p>
        </div>
      </footer>
    </div>
  );
}

export function PublicShell({
  children,
  locale,
  dictionary,
  initialTheme,
  initialWatchlist,
  shellData,
}) {
  return (
    <PreferencesProvider
      initialLocale={locale}
      initialTheme={initialTheme}
      initialWatchlist={initialWatchlist}
    >
      <ShellFrame
        locale={locale}
        dictionary={dictionary}
        watchlistItems={initialWatchlist}
        shellData={shellData}
      >
        {children}
      </ShellFrame>
    </PreferencesProvider>
  );
}
