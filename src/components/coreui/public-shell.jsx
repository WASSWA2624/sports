"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { PreferencesProvider, usePreferences } from "./preferences-provider";
import { ShellSearch } from "./shell-search";
import { ShellIcon } from "./shell-icons";
import styles from "./styles.module.css";
import { SCORES_NAV, SPORTS_STRIP, TOP_LEVEL_NAV } from "../../lib/coreui/config";
import { getScoreViewLabel, getSportLabel } from "../../lib/coreui/dictionaries";

function ShellFrame({ children, locale, dictionary, watchlistItems, shellData }) {
  const pathname = usePathname();
  const { sessionUser, watchlist, watchlistCount, recentViews } = usePreferences();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isNewsMode = pathname === `/${locale}/news` || pathname.startsWith(`/${locale}/news/`);
  const isProfilePage = pathname === "/profile" || pathname.startsWith("/profile/");
  const isFavoritesPage = pathname === `/${locale}/favorites` || pathname.startsWith(`/${locale}/favorites/`);
  const watchCount = watchlistCount || watchlistItems.length;
  const shellChrome = shellData?.chrome || {};
  const shellModuleMap = shellChrome.shellModuleMap || {};
  const adSlotEnabled = shellModuleMap.shell_right_rail_ad_slot ?? true;
  const consentEnabled = shellModuleMap.shell_right_rail_consent ?? true;
  const supportEnabled = shellModuleMap.shell_right_rail_support ?? true;
  const adSlotCopy =
    shellChrome.adSlot?.copy || shellChrome.adSlot?.name || dictionary.adSlotCopy;
  const consentTitle = shellChrome.consentText?.title || dictionary.consent;
  const consentBody = shellChrome.consentText?.body || dictionary.consentBody;
  const allCompetitions = [
    ...(shellData?.featuredCompetitions || []),
    ...((shellData?.countryGroups || []).flatMap((group) =>
      group.leagues.map((league) => ({
        ...league,
        country: group.country,
      }))
    )),
  ];

  const savedCompetitions = [...new Set(
    [...watchlist, ...recentViews]
      .filter((itemId) => itemId.startsWith("competition:"))
      .map((itemId) => itemId.split(":")[1])
  )]
    .map((competitionCode) =>
      allCompetitions.find((competition) => competition.code === competitionCode)
    )
    .filter(Boolean);

  const savedTeams = [...new Set(
    [...watchlist, ...recentViews]
      .filter((itemId) => itemId.startsWith("team:"))
      .map((itemId) => itemId.split(":")[1])
  )]
    .map((teamId) =>
      (shellData?.teamDirectory || []).find((team) => team.id === teamId || team.code === teamId)
    )
    .filter(Boolean);
  const recentItems = recentViews
    .map((itemId) => {
      const [prefix, entityId] = itemId.split(":");

      if (prefix === "competition") {
        const competition = allCompetitions.find((entry) => entry.code === entityId);
        return competition
          ? {
              key: itemId,
              href: `/${locale}/leagues/${competition.code}`,
              title: competition.name,
              subtitle: competition.country || dictionary.competition,
            }
          : null;
      }

      if (prefix === "team") {
        const team = (shellData?.teamDirectory || []).find((entry) => entry.id === entityId);
        return team
          ? {
              key: itemId,
              href: `/${locale}/teams/${team.id}`,
              title: team.name,
              subtitle: team.leagueName || dictionary.teams,
            }
          : null;
      }

      if (prefix === "fixture") {
        const fixture = (shellData?.fixtureDirectory || []).find((entry) => entry.id === entityId);
        return fixture
          ? {
              key: itemId,
              href: `/${locale}/match/${fixture.externalRef || fixture.id}`,
              title: fixture.label,
              subtitle: fixture.leagueName || dictionary.match,
            }
          : null;
      }

      return null;
    })
    .filter(Boolean)
    .slice(0, 6);

  const pinnedCompetitions =
    savedCompetitions.length > 0
      ? savedCompetitions
      : (shellData?.featuredCompetitions || []).slice(0, 6);
  const favoriteSport = SPORTS_STRIP.find((sport) => sport.key === "favorites");
  const moreSport = SPORTS_STRIP.find((sport) => sport.key === "more");
  const rankedSports = SPORTS_STRIP.filter(
    (sport) => sport.key !== "favorites" && sport.key !== "more"
  );
  const menuSports = SPORTS_STRIP.filter((sport) => sport.key !== "more");
  const countryGroups = shellData?.countryGroups || [];
  const accountLabel = sessionUser ? dictionary.profile : dictionary.login;
  const primarySports = rankedSports.slice(0, 3);
  const overflowSports = rankedSports.slice(3);
  const activeSport = rankedSports.find((sport) => sport.enabled) || rankedSports[0] || null;
  const browseItems = TOP_LEVEL_NAV.map((item) => {
    const href = `/${locale}${item.href}`;
    const active =
      item.key === "news"
        ? isNewsMode
        : !isNewsMode && (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));

    return {
      ...item,
      href,
      active,
      label: item.key === "scores" ? dictionary.scores : dictionary.news,
    };
  });

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerTopRow}>
            <div className={styles.headerBrand}>
              <div className={styles.brandLockup}>
                <div className={styles.brandMark} aria-hidden="true">
                  SP
                </div>
                <div className={styles.brandBlock}>
                  <Link href={`/${locale}`} className={styles.brand}>
                    {dictionary.brand}
                  </Link>
                  <p className={styles.brandTag}>{dictionary.brandTag}</p>
                </div>
              </div>
            </div>

            <nav className={styles.topModeNav} aria-label={dictionary.browse}>
              {browseItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={item.active ? styles.topModeLinkActive : styles.topModeLink}
                >
                  <span className={styles.modeLinkContent}>
                    <ShellIcon name={item.key} className={styles.modeIcon} />
                    <span>{item.label}</span>
                  </span>
                </Link>
              ))}
            </nav>

            <div className={styles.headerControls}>
              <ShellSearch
                dictionary={dictionary}
                locale={locale}
                shortcuts={shellData?.searchShortcuts || []}
                shellData={shellData}
              />
              <Link
                href="/profile"
                aria-label={sessionUser ? dictionary.profile : dictionary.login}
                className={`${styles.sectionAction} ${styles.headerAction} ${styles.desktopAccountLink}`}
              >
                <ShellIcon name="profile" className={styles.controlIcon} />
                <span className={styles.headerActionLabel}>
                  {sessionUser ? dictionary.profile : dictionary.login}
                </span>
              </Link>
              <button
                type="button"
                className={styles.mobileMenuButton}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-shell-menu"
                aria-label={dictionary.menu}
                onClick={() => setMobileMenuOpen((current) => !current)}
              >
                <ShellIcon name="menu" className={styles.controlIcon} />
                <span className={styles.mobileMenuButtonLabel}>{dictionary.menu}</span>
              </button>
            </div>
          </div>

          <div className={styles.headerNavRail}>
            <nav className={styles.mobileModeNav} aria-label={dictionary.browse}>
              {browseItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={item.active ? styles.mobileModeLinkActive : styles.mobileModeLink}
                >
                  <span className={styles.modeLinkContent}>
                    <ShellIcon name={item.key} className={styles.modeIcon} />
                    <span>{item.label}</span>
                  </span>
                </Link>
              ))}
            </nav>

            {!isNewsMode && activeSport ? (
              activeSport.enabled ? (
                <Link href={`/${locale}${activeSport.href}`} className={styles.mobileSportPill}>
                  <span className={styles.sportLinkContent}>
                    <ShellIcon name={activeSport.key} className={styles.sportIcon} />
                    <span>{getSportLabel(activeSport.key, dictionary)}</span>
                  </span>
                </Link>
              ) : (
                <button type="button" className={styles.mobileSportPill}>
                  <span className={styles.sportLinkContent}>
                    <ShellIcon name={activeSport.key} className={styles.sportIcon} />
                    <span>{getSportLabel(activeSport.key, dictionary)}</span>
                  </span>
                </button>
              )
            ) : null}

            {!isNewsMode ? (
              <nav className={styles.sportsStrip} aria-label={dictionary.sports}>
                {favoriteSport?.href ? (
                  <Link
                    key={favoriteSport.key}
                    href={`/${locale}${favoriteSport.href}`}
                    className={isFavoritesPage ? styles.sportsChipActive : styles.sportsChip}
                  >
                    <span className={styles.sportLinkContent}>
                      <ShellIcon name={favoriteSport.key} className={styles.sportIcon} />
                      <span>{getSportLabel(favoriteSport.key, dictionary)}</span>
                    </span>
                    <span className={styles.sportsCount}>{watchCount}</span>
                  </Link>
                ) : null}

                {primarySports.map((sport) => {
                  if (sport.enabled) {
                    return (
                      <Link
                        key={sport.key}
                        href={`/${locale}${sport.href}`}
                        className={sport.key === "football" && !isNewsMode ? styles.sportsChipActive : styles.sportsChip}
                      >
                        <span className={styles.sportLinkContent}>
                          <ShellIcon name={sport.key} className={styles.sportIcon} />
                          <span>{getSportLabel(sport.key, dictionary)}</span>
                        </span>
                      </Link>
                    );
                  }

                  return (
                    <button key={sport.key} type="button" className={styles.sportsChipDisabled}>
                      <span className={styles.sportLinkContent}>
                        <ShellIcon name={sport.key} className={styles.sportIcon} />
                        <span>{getSportLabel(sport.key, dictionary)}</span>
                      </span>
                    </button>
                  );
                })}

                {overflowSports.length && moreSport ? (
                  <details className={styles.sportsMoreMenu}>
                    <summary className={styles.sportsMoreSummary}>
                      <span className={styles.sportLinkContent}>
                        <ShellIcon name={moreSport.key} className={styles.sportIcon} />
                        <span>{getSportLabel(moreSport.key, dictionary)}</span>
                      </span>
                    </summary>

                    <div className={styles.sportsMorePanel}>
                      {overflowSports.map((sport) => {
                        const content = (
                          <span className={styles.sportLinkContent}>
                            <ShellIcon name={sport.key} className={styles.sportIcon} />
                            <span>{getSportLabel(sport.key, dictionary)}</span>
                          </span>
                        );

                        if (sport.enabled) {
                          return (
                            <Link
                              key={sport.key}
                              href={`/${locale}${sport.href}`}
                              className={styles.sportsMoreItem}
                            >
                              {content}
                            </Link>
                          );
                        }

                        return (
                          <button
                            key={sport.key}
                            type="button"
                            className={`${styles.sportsMoreItem} ${styles.sportsMoreItemMuted}`}
                          >
                            {content}
                          </button>
                        );
                      })}
                    </div>
                  </details>
                ) : null}
              </nav>
            ) : null}
          </div>
        </div>
      </header>

      {mobileMenuOpen ? (
        <div className={styles.mobileMenuOverlay} onClick={() => setMobileMenuOpen(false)}>
          <div
            id="mobile-shell-menu"
            className={styles.mobileMenuPanel}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.mobileMenuHeader}>
              <div className={styles.mobileMenuHeaderIntro}>
                <div className={styles.mobileMenuHeaderLockup}>
                  <div className={styles.brandMark} aria-hidden="true">
                    SP
                  </div>
                  <div className={styles.mobileMenuHeaderCopy}>
                    <strong>{dictionary.menu}</strong>
                    <span>{dictionary.brandTag}</span>
                  </div>
                </div>

                <div className={styles.mobileMenuHeaderStats}>
                  <div className={styles.mobileMenuStat}>
                    <span>{dictionary.watchlist}</span>
                    <strong>{watchCount}</strong>
                  </div>
                  <div className={styles.mobileMenuStat}>
                    <span>{dictionary.sports}</span>
                    <strong>{menuSports.length}</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={styles.mobileMenuClose}
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShellIcon name="close" className={styles.controlIcon} />
                <span>{dictionary.close}</span>
              </button>
            </div>

            <div className={styles.mobileMenuBody}>
              <div className={styles.mobileMenuSectionsGrid}>
                <section className={`${styles.mobileMenuSection} ${styles.mobileMenuSectionFeatured}`}>
                  <div className={styles.mobileMenuSectionHead}>
                    <h2 className={styles.mobileMenuSectionTitle}>{dictionary.browse}</h2>
                    <span className={styles.mobileMenuSectionCount}>{TOP_LEVEL_NAV.length}</span>
                  </div>

                  <div className={`${styles.mobileMenuList} ${styles.mobileMenuQuickGrid}`}>
                    {TOP_LEVEL_NAV.map((item) => {
                      const href = `/${locale}${item.href}`;
                      const active =
                        item.key === "news"
                          ? isNewsMode
                          : !isNewsMode &&
                            (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));

                      return (
                        <Link
                          key={item.key}
                          href={href}
                          className={active ? styles.mobileMenuLinkActive : styles.mobileMenuLink}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <span className={styles.mobileMenuItemContent}>
                            <ShellIcon name={item.key} className={styles.controlIcon} />
                            <span>{item.key === "scores" ? dictionary.scores : dictionary.news}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>

                <section className={`${styles.mobileMenuSection} ${styles.mobileMenuSectionCompact}`}>
                  <div className={styles.mobileMenuSectionHead}>
                    <h2 className={styles.mobileMenuSectionTitle}>{dictionary.account}</h2>
                    <span className={styles.mobileMenuSectionCount}>1</span>
                  </div>

                  <div className={`${styles.mobileMenuList} ${styles.mobileMenuQuickGrid}`}>
                    <Link
                      href="/profile"
                      className={isProfilePage ? styles.mobileMenuLinkActive : styles.mobileMenuLink}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className={styles.mobileMenuItemContent}>
                        <ShellIcon name="profile" className={styles.controlIcon} />
                        <span>{accountLabel}</span>
                      </span>
                    </Link>
                  </div>
                </section>

                <section className={`${styles.mobileMenuSection} ${styles.mobileMenuSectionWide}`}>
                  <div className={styles.mobileMenuSectionHead}>
                    <h2 className={styles.mobileMenuSectionTitle}>{dictionary.scoreViews}</h2>
                    <span className={styles.mobileMenuSectionCount}>{SCORES_NAV.length}</span>
                  </div>

                  <div className={`${styles.mobileMenuList} ${styles.mobileMenuScoreGrid}`}>
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
                          className={active ? styles.mobileMenuLinkActive : styles.mobileMenuLink}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {getScoreViewLabel(item.key, dictionary)}
                        </Link>
                      );
                    })}
                  </div>
                </section>

                <section className={`${styles.mobileMenuSection} ${styles.mobileMenuSectionWide}`}>
                  <div className={styles.mobileMenuSectionHead}>
                    <h2 className={styles.mobileMenuSectionTitle}>{dictionary.sports}</h2>
                    <span className={styles.mobileMenuSectionCount}>{menuSports.length}</span>
                  </div>

                  <div className={`${styles.mobileMenuList} ${styles.mobileMenuSportsGrid}`}>
                    {menuSports.map((sport) => {
                      const content = (
                        <span className={styles.mobileMenuItemContent}>
                          <ShellIcon name={sport.key} className={styles.sportIcon} />
                          <span>{getSportLabel(sport.key, dictionary)}</span>
                        </span>
                      );

                      if (sport.key === "favorites") {
                        return sport.href ? (
                          <Link
                            key={sport.key}
                            href={`/${locale}${sport.href}`}
                            className={isFavoritesPage ? styles.mobileMenuLinkActive : styles.mobileMenuLink}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <span className={styles.mobileMenuItemContent}>
                              <ShellIcon name={sport.key} className={styles.sportIcon} />
                              <span>{getSportLabel(sport.key, dictionary)}</span>
                            </span>
                            <span className={styles.badge}>{watchCount}</span>
                          </Link>
                        ) : (
                          <div key={sport.key} className={styles.mobileMenuSportRow}>
                            {content}
                            <span className={styles.badge}>{watchCount}</span>
                          </div>
                        );
                      }

                      if (sport.enabled) {
                        return (
                          <Link
                            key={sport.key}
                            href={`/${locale}${sport.href}`}
                            className={styles.mobileMenuLink}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {content}
                          </Link>
                        );
                      }

                      return (
                        <div key={sport.key} className={`${styles.mobileMenuLink} ${styles.mobileMenuLinkMuted}`}>
                          {content}
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className={`${styles.mobileMenuSection} ${styles.mobileMenuSectionWide}`}>
                  <div className={styles.mobileMenuSectionHead}>
                    <h2 className={styles.mobileMenuSectionTitle}>{dictionary.preferences}</h2>
                  </div>

                  <div className={styles.mobileMenuPreferences}>
                    <LocaleSwitcher locale={locale} label={dictionary.locale} />
                    <ThemeToggle label={dictionary.theme} locale={locale} />
                    <div className={`${styles.watchPill} ${styles.mobileMenuWatchPill}`}>
                      <ShellIcon name="favorites" className={styles.controlIcon} />
                      <span>{dictionary.watchlist}</span>
                      <strong className={styles.watchValue}>{watchCount}</strong>
                    </div>
                  </div>
                </section>

                <section className={styles.mobileMenuSection}>
                  <div className={styles.mobileMenuSectionHead}>
                    <h2 className={styles.mobileMenuSectionTitle}>{dictionary.pinnedCompetitions}</h2>
                    <span className={styles.mobileMenuSectionCount}>{pinnedCompetitions.length}</span>
                  </div>

                  <div className={styles.mobileMenuList}>
                    {pinnedCompetitions.length ? (
                      pinnedCompetitions.map((competition) => (
                        <Link
                          key={competition.code}
                          href={`/${locale}/leagues/${competition.code}`}
                          className={styles.mobileMenuLink}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {competition.name}
                        </Link>
                      ))
                    ) : (
                      <p className={styles.railMuted}>{dictionary.watchlistEmpty}</p>
                    )}
                  </div>
                </section>

                <section className={styles.mobileMenuSection}>
                  <div className={styles.mobileMenuSectionHead}>
                    <h2 className={styles.mobileMenuSectionTitle}>{dictionary.myTeams}</h2>
                    <span className={styles.mobileMenuSectionCount}>{savedTeams.length}</span>
                  </div>

                  <div className={styles.mobileMenuList}>
                    {savedTeams.length ? (
                      savedTeams.map((team) => (
                        <Link
                          key={team.id}
                          href={`/${locale}/teams/${team.id}`}
                          className={styles.mobileMenuLink}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {team.name}
                        </Link>
                      ))
                    ) : (
                      <p className={styles.railMuted}>{dictionary.saveTeamsPrompt}</p>
                    )}
                  </div>
                </section>

                <section className={styles.mobileMenuSection}>
                  <div className={styles.mobileMenuSectionHead}>
                    <h2 className={styles.mobileMenuSectionTitle}>{dictionary.countries}</h2>
                    <span className={styles.mobileMenuSectionCount}>{countryGroups.length}</span>
                  </div>

                  <div className={styles.mobileMenuList}>
                    {countryGroups.map((group) => (
                      group.href ? (
                        <Link
                          key={group.country}
                          href={`/${locale}${group.href}`}
                          className={styles.mobileMenuLink}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <span className={styles.mobileMenuItemContent}>
                            <span>{group.country}</span>
                            <span className={styles.badge}>{group.leagues.length}</span>
                          </span>
                        </Link>
                      ) : (
                        <div key={group.country} className={styles.mobileMenuCountryRow}>
                          <span>{group.country}</span>
                          <span className={styles.badge}>{group.leagues.length}</span>
                        </div>
                      )
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <main className={styles.main}>
        <div className={styles.shellColumns}>
          <aside className={styles.leftRail}>
            <section className={styles.railCard}>
              <div className={styles.railSection}>
                <h2 className={styles.railSectionTitle}>{dictionary.scoreViews}</h2>
                <div className={styles.railList}>
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
                        className={active ? styles.railLinkActive : styles.railLink}
                      >
                        {getScoreViewLabel(item.key, dictionary)}
                      </Link>
                    );
                  })}
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
                    <p className={styles.railMuted}>{dictionary.saveTeamsPrompt}</p>
                  )}
                </div>
              </div>
            </section>

            <section className={styles.railCard}>
              <div className={styles.railSection}>
                <h2 className={styles.railSectionTitle}>{dictionary.recentItemsTitle}</h2>
                <div className={styles.railList}>
                  {recentItems.length ? (
                    recentItems.map((item) => (
                      <Link key={item.key} href={item.href} className={styles.railLink}>
                        <span>{item.title}</span>
                        <span className={styles.badge}>{item.subtitle}</span>
                      </Link>
                    ))
                  ) : (
                    <p className={styles.railMuted}>{dictionary.searchRecentEmpty}</p>
                  )}
                </div>
              </div>
            </section>

            <section className={styles.railCard}>
              <div className={styles.railSection}>
                <h2 className={styles.railSectionTitle}>{dictionary.countries}</h2>
                <div className={styles.railList}>
                  {(shellData?.countryGroups || []).map((group) => (
                    group.href ? (
                      <Link key={group.country} href={`/${locale}${group.href}`} className={styles.railLink}>
                        <span>{group.country}</span>
                        <span className={styles.badge}>{group.leagues.length}</span>
                      </Link>
                    ) : (
                      <div key={group.country} className={styles.railCountryRow}>
                        <strong>{group.country}</strong>
                        <span className={styles.badge}>{group.leagues.length}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </section>
          </aside>

          <div className={styles.centerRail}>{children}</div>

          <aside className={styles.rightRail}>
            {adSlotEnabled ? (
              <section className={styles.railCard}>
                <div className={styles.railSection}>
                  <h2 className={styles.railSectionTitle}>{dictionary.adSlot}</h2>
                  <div className={styles.adSlot}>{adSlotCopy}</div>
                </div>
              </section>
            ) : null}

            {consentEnabled ? (
              <section className={styles.railCard}>
                <div className={styles.railSection}>
                  <h2 className={styles.railSectionTitle}>{consentTitle}</h2>
                  <p className={styles.railMuted}>{consentBody}</p>
                </div>
              </section>
            ) : null}

            {supportEnabled ? (
              <section className={styles.railCard}>
                <div className={styles.railSection}>
                  <h2 className={styles.railSectionTitle}>{dictionary.supportRail}</h2>
                  <p className={styles.railMuted}>{dictionary.supportRailBody}</p>
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p>{dictionary.footerSummary}</p>
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
  initialAlertSettings,
  initialRecentViews,
  initialFavoriteSports,
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
