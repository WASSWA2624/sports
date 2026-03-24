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
import {
  LOCALE_LABELS,
  SCORES_NAV,
  SPORTS_STRIP,
  TOP_LEVEL_NAV,
} from "../../lib/coreui/config";
import { getScoreViewLabel, getSportLabel } from "../../lib/coreui/dictionaries";
import { getGeoLabel, isGeoAllowed } from "../../lib/coreui/route-context";

function formatCount(locale, value) {
  return new Intl.NumberFormat(locale).format(Number(value || 0));
}

function formatList(locale, values = []) {
  const items = (values || []).filter(Boolean);

  if (!items.length) {
    return "";
  }

  if (typeof Intl.ListFormat === "function") {
    return new Intl.ListFormat(locale, {
      style: "short",
      type: "conjunction",
    }).format(items);
  }

  return items.join(", ");
}

function getActiveSportKey(pathname, locale, favoriteSports = []) {
  const segments = String(pathname || "")
    .split("/")
    .filter(Boolean);

  if (segments[0] !== locale) {
    return favoriteSports[0] || "football";
  }

  if (segments[1] === "favorites") {
    return "favorites";
  }

  if (segments[1] === "sports" && segments[2]) {
    return segments[2];
  }

  return favoriteSports[0] || "football";
}

function prioritizeSports(sports = [], favoriteSports = [], activeSportKey = "football") {
  const favoriteSet = new Set((favoriteSports || []).filter(Boolean));

  return [...sports].sort((left, right) => {
    const leftScore =
      (left.key === activeSportKey ? 40 : 0) +
      (favoriteSet.has(left.key) ? 20 : 0) +
      (left.key === "football" ? 10 : 0);
    const rightScore =
      (right.key === activeSportKey ? 40 : 0) +
      (favoriteSet.has(right.key) ? 20 : 0) +
      (right.key === "football" ? 10 : 0);

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    return SPORTS_STRIP.findIndex((sport) => sport.key === left.key) -
      SPORTS_STRIP.findIndex((sport) => sport.key === right.key);
  });
}

function buildPreferenceWeightMap(itemIds = []) {
  const size = itemIds.length;

  return itemIds.reduce((accumulator, itemId, index) => {
    accumulator.set(itemId, Math.max(1, size - index));
    return accumulator;
  }, new Map());
}

function ShellFrame({ children, locale, dictionary, watchlistItems, shellData, viewerGeo }) {
  const pathname = usePathname();
  const {
    compliance,
    ctaGeo,
    effectiveGeo,
    favoriteSports,
    promptPreferences,
    recentViews,
    sessionUser,
    setPromptPreference,
    theme,
    watchlist,
    watchlistCount,
  } = usePreferences();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isNewsMode = pathname === `/${locale}/news` || pathname.startsWith(`/${locale}/news/`);
  const isProfilePage = pathname === "/profile" || pathname.startsWith("/profile/");
  const isAuthPage = pathname === `/${locale}/auth` || pathname.startsWith(`/${locale}/auth/`);
  const isFavoritesPage = pathname === `/${locale}/favorites` || pathname.startsWith(`/${locale}/favorites/`);
  const isSettingsPage = pathname === `/${locale}/settings` || pathname.startsWith(`/${locale}/settings/`);
  const watchCount = watchlistCount || watchlistItems.length;
  const shellChrome = shellData?.chrome || {};
  const platform = shellData?.platform || {};
  const shellModuleMap = shellChrome.shellModuleMap || {};
  const adSlotEnabled = shellModuleMap.shell_right_rail_ad_slot ?? true;
  const consentEnabled = shellModuleMap.shell_right_rail_consent ?? true;
  const supportEnabled = shellModuleMap.shell_right_rail_support ?? true;
  const funnelEnabled = shellModuleMap.shell_right_rail_funnel_entry ?? true;
  const adSlotCopy =
    shellChrome.adSlot?.copy || shellChrome.adSlot?.name || dictionary.adSlotCopy;
  const consentTitle = shellChrome.consentText?.title || dictionary.consent;
  const consentBody = shellChrome.consentText?.body || dictionary.consentBody;
  const currentGeo = ctaGeo || effectiveGeo || viewerGeo || platform.defaultGeo || "INTL";
  const currentGeoLabel = platform.geoLabels?.[currentGeo] || getGeoLabel(currentGeo);
  const affiliatePartner =
    platform.affiliate?.partnerByGeo?.[currentGeo]?.[0] ||
    platform.affiliate?.primaryPartner ||
    null;
  const bookmakerPartners =
    platform.affiliate?.bookmakerByGeo?.[currentGeo] ||
    platform.affiliate?.bookmakerByGeo?.INTL ||
    [];
  const funnelActions = (platform.funnel?.actions || []).filter((action) =>
    action.url && isGeoAllowed(currentGeo, action.enabledGeos)
  );
  const launchMarketLabels = [...new Set((platform.launchGeos || []).map((geo) =>
    platform.geoLabels?.[geo] || getGeoLabel(geo)
  ))];
  const allCompetitions = [
    ...(shellData?.featuredCompetitions || []),
    ...((shellData?.countryGroups || []).flatMap((group) =>
      group.leagues.map((league) => ({
        ...league,
        country: group.country,
      }))
    )),
  ];
  const watchWeights = buildPreferenceWeightMap(watchlist || []);
  const recentWeights = buildPreferenceWeightMap(recentViews || []);
  const favoriteSportSet = new Set((favoriteSports || []).filter(Boolean));

  const savedCompetitions = [...new Set(
    [...watchlist, ...recentViews]
      .filter((itemId) => itemId.startsWith("competition:"))
      .map((itemId) => itemId.split(":")[1])
  )]
    .map((competitionCode) =>
      allCompetitions.find((competition) => competition.code === competitionCode)
    )
    .filter(Boolean)
    .sort((left, right) => {
      const leftItemId = `competition:${left.code}`;
      const rightItemId = `competition:${right.code}`;
      const leftScore =
        (watchWeights.get(leftItemId) || 0) * 100 +
        (recentWeights.get(leftItemId) || 0) * 70 +
        (favoriteSportSet.has(left.sportSlug) ? 24 : 0);
      const rightScore =
        (watchWeights.get(rightItemId) || 0) * 100 +
        (recentWeights.get(rightItemId) || 0) * 70 +
        (favoriteSportSet.has(right.sportSlug) ? 24 : 0);

      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return (left.name || "").localeCompare(right.name || "");
    });

  const savedTeams = [...new Set(
    [...watchlist, ...recentViews]
      .filter((itemId) => itemId.startsWith("team:"))
      .map((itemId) => itemId.split(":")[1])
  )]
    .map((teamId) =>
      (shellData?.teamDirectory || []).find((team) => team.id === teamId || team.code === teamId)
    )
    .filter(Boolean)
    .sort((left, right) => {
      const leftItemId = `team:${left.id}`;
      const rightItemId = `team:${right.id}`;
      const leftScore =
        (watchWeights.get(leftItemId) || 0) * 100 +
        (recentWeights.get(leftItemId) || 0) * 70 +
        (watchWeights.get(`competition:${left.leagueCode}`) || 0) * 24 +
        (recentWeights.get(`competition:${left.leagueCode}`) || 0) * 16;
      const rightScore =
        (watchWeights.get(rightItemId) || 0) * 100 +
        (recentWeights.get(rightItemId) || 0) * 70 +
        (watchWeights.get(`competition:${right.leagueCode}`) || 0) * 24 +
        (recentWeights.get(`competition:${right.leagueCode}`) || 0) * 16;

      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return (left.name || "").localeCompare(right.name || "");
    });
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
      : [...(shellData?.featuredCompetitions || [])]
          .sort((left, right) => {
            const leftScore =
              (favoriteSportSet.has(left.sportSlug) ? 20 : 0) +
              (watchWeights.get(`competition:${left.code}`) || 0) * 10 +
              (recentWeights.get(`competition:${left.code}`) || 0) * 6;
            const rightScore =
              (favoriteSportSet.has(right.sportSlug) ? 20 : 0) +
              (watchWeights.get(`competition:${right.code}`) || 0) * 10 +
              (recentWeights.get(`competition:${right.code}`) || 0) * 6;

            if (rightScore !== leftScore) {
              return rightScore - leftScore;
            }

            return (left.name || "").localeCompare(right.name || "");
          })
          .slice(0, 6);
  const topCompetitions = [...(shellData?.featuredCompetitions || [])]
    .sort((left, right) => {
      const leftScore =
        (favoriteSportSet.has(left.sportSlug) ? 20 : 0) +
        (watchWeights.get(`competition:${left.code}`) || 0) * 10 +
        (recentWeights.get(`competition:${left.code}`) || 0) * 6;
      const rightScore =
        (favoriteSportSet.has(right.sportSlug) ? 20 : 0) +
        (watchWeights.get(`competition:${right.code}`) || 0) * 10 +
        (recentWeights.get(`competition:${right.code}`) || 0) * 6;

      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return (left.name || "").localeCompare(right.name || "");
    })
    .slice(0, 6);
  const favoriteSport = SPORTS_STRIP.find((sport) => sport.key === "favorites");
  const moreSport = SPORTS_STRIP.find((sport) => sport.key === "more");
  const activeSportKey = getActiveSportKey(pathname, locale, favoriteSports);
  const rankedSports = prioritizeSports(
    SPORTS_STRIP.filter((sport) => sport.key !== "favorites" && sport.key !== "more"),
    favoriteSports,
    activeSportKey
  );
  const menuSports = [favoriteSport, ...rankedSports].filter(Boolean);
  const countryGroups = shellData?.countryGroups || [];
  const accountLabel = sessionUser ? dictionary.profile : dictionary.login;
  const accountHref = sessionUser ? "/profile" : `/${locale}/auth`;
  const primarySports = rankedSports.slice(0, 4);
  const overflowSports = rankedSports.slice(4);
  const activeSport =
    activeSportKey === "favorites"
      ? favoriteSport
      : rankedSports.find((sport) => sport.key === activeSportKey) ||
        rankedSports.find((sport) => sport.enabled) ||
        rankedSports[0] ||
        null;
  const activeThemeLabel = {
    light: dictionary.themeLight,
    dark: dictionary.themeDark,
    system: dictionary.themeSystem,
  }[theme] || dictionary.themeSystem;
  const formattedWatchCount = formatCount(locale, watchCount);
  const formattedSportCount = formatCount(locale, rankedSports.length);
  const formattedPinnedCount = formatCount(locale, pinnedCompetitions.length);
  const formattedTeamCount = formatCount(locale, savedTeams.length);
  const formattedMarketCount = formatCount(locale, launchMarketLabels.length || 1);
  const localeLabel = LOCALE_LABELS[locale] || locale.toUpperCase();
  const bookmakerSummary = bookmakerPartners.length
    ? formatList(locale, bookmakerPartners.slice(0, 3))
    : null;
  const legalNotices = [
    dictionary.oddsLegalAge,
    dictionary.oddsLegalJurisdiction,
    dictionary.oddsLegalSupport,
  ];
  const renderScoreViewContent = (item) => (
    <span className={styles.scoreViewItemContent}>
      <ShellIcon name={item.key} className={styles.controlIcon} />
      <span>{getScoreViewLabel(item.key, dictionary)}</span>
    </span>
  );
  const modeSwitchLink = {
    href: isNewsMode ? `/${locale}` : `/${locale}/news`,
    label: isNewsMode ? dictionary.scores : dictionary.news,
  };
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
                  <div className={styles.brandMetaRow}>
                    <p className={styles.brandTag}>{dictionary.brandTag}</p>
                    <span className={styles.headerMarketBadge}>{currentGeoLabel}</span>
                  </div>
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
                href={`/${locale}/favorites`}
                className={
                  isFavoritesPage
                    ? `${styles.sectionAction} ${styles.headerAction} ${styles.headerUtilityActionActive}`
                    : `${styles.sectionAction} ${styles.headerAction} ${styles.headerUtilityAction}`
                }
              >
                <ShellIcon name="favorites" className={styles.controlIcon} />
                <span className={styles.headerActionLabel}>{dictionary.favorites}</span>
                <span className={styles.utilityCount}>{formattedWatchCount}</span>
              </Link>
              <Link
                href={`/${locale}/settings`}
                className={
                  isSettingsPage
                    ? `${styles.sectionAction} ${styles.headerAction} ${styles.headerUtilityActionActive}`
                    : `${styles.sectionAction} ${styles.headerAction} ${styles.headerUtilityAction}`
                }
              >
                <ShellIcon name="theme" className={styles.controlIcon} />
                <span className={styles.headerActionLabel}>{dictionary.metaSettingsTitle}</span>
              </Link>
              <Link
                href={accountHref}
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
                    <span className={styles.sportsCount}>{formattedWatchCount}</span>
                  </Link>
                ) : null}

                {primarySports.map((sport) => {
                  const isActiveSport = sport.key === activeSportKey;

                  if (sport.enabled) {
                    return (
                      <Link
                        key={sport.key}
                        href={`/${locale}${sport.href}`}
                        className={isActiveSport ? styles.sportsChipActive : styles.sportsChip}
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
                    <strong>{formattedWatchCount}</strong>
                  </div>
                  <div className={styles.mobileMenuStat}>
                    <span>{dictionary.sports}</span>
                    <strong>{formattedSportCount}</strong>
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
                    <span className={styles.mobileMenuSectionCount}>2</span>
                  </div>

                  <div className={`${styles.mobileMenuList} ${styles.mobileMenuQuickGrid}`}>
                    <Link
                      href={accountHref}
                      className={
                        isProfilePage || isAuthPage ? styles.mobileMenuLinkActive : styles.mobileMenuLink
                      }
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className={styles.mobileMenuItemContent}>
                        <ShellIcon name="profile" className={styles.controlIcon} />
                        <span>{accountLabel}</span>
                      </span>
                    </Link>
                    <Link
                      href={`/${locale}/settings`}
                      className={isSettingsPage ? styles.mobileMenuLinkActive : styles.mobileMenuLink}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className={styles.mobileMenuItemContent}>
                        <ShellIcon name="theme" className={styles.controlIcon} />
                        <span>{dictionary.metaSettingsTitle}</span>
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
                          {renderScoreViewContent(item)}
                        </Link>
                      );
                    })}
                  </div>
                </section>

                <section className={`${styles.mobileMenuSection} ${styles.mobileMenuSectionWide}`}>
                  <div className={styles.mobileMenuSectionHead}>
                    <h2 className={styles.mobileMenuSectionTitle}>{dictionary.sports}</h2>
                    <span className={styles.mobileMenuSectionCount}>{formattedSportCount}</span>
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
                            <span className={styles.badge}>{formattedWatchCount}</span>
                          </Link>
                        ) : (
                          <div key={sport.key} className={styles.mobileMenuSportRow}>
                            {content}
                            <span className={styles.badge}>{formattedWatchCount}</span>
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
                      <strong className={styles.watchValue}>{formattedWatchCount}</strong>
                    </div>
                  </div>
                </section>

                <section className={styles.mobileMenuSection}>
                  <div className={styles.mobileMenuSectionHead}>
                    <h2 className={styles.mobileMenuSectionTitle}>{dictionary.topCompetitionsTitle}</h2>
                    <span className={styles.mobileMenuSectionCount}>
                      {formatCount(locale, topCompetitions.length)}
                    </span>
                  </div>

                  <div className={styles.mobileMenuList}>
                    {topCompetitions.length ? (
                      topCompetitions.map((competition) => (
                        <Link
                          key={competition.code}
                          href={`/${locale}/leagues/${competition.code}`}
                          className={styles.mobileMenuLink}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <span className={styles.mobileMenuItemContent}>
                            <span>{competition.name}</span>
                            {competition.country ? (
                              <span className={styles.badge}>{competition.country}</span>
                            ) : null}
                          </span>
                        </Link>
                      ))
                    ) : (
                      <p className={styles.railMuted}>{dictionary.noData}</p>
                    )}
                  </div>
                </section>

                <section className={styles.mobileMenuSection}>
                  <div className={styles.mobileMenuSectionHead}>
                    <h2 className={styles.mobileMenuSectionTitle}>{dictionary.pinnedCompetitions}</h2>
                    <span className={styles.mobileMenuSectionCount}>{formattedPinnedCount}</span>
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
                    <span className={styles.mobileMenuSectionCount}>{formattedTeamCount}</span>
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
                <div className={styles.inlineBadgeRow}>
                  <h2 className={styles.railSectionTitle}>{dictionary.scoreViews}</h2>
                  <span className={styles.badge}>{currentGeoLabel}</span>
                </div>
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
                        {renderScoreViewContent(item)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className={styles.railCard}>
              <div className={styles.railSection}>
                <div className={styles.inlineBadgeRow}>
                  <h2 className={styles.railSectionTitle}>{dictionary.topCompetitionsTitle}</h2>
                  <span className={styles.badge}>{formatCount(locale, topCompetitions.length)}</span>
                </div>
                <div className={styles.railList}>
                  {topCompetitions.length ? (
                    topCompetitions.map((competition) => (
                      <Link
                        key={competition.code}
                        href={`/${locale}/leagues/${competition.code}`}
                        className={styles.railLink}
                      >
                        <span>{competition.name}</span>
                        {competition.country ? (
                          <span className={styles.badge}>{competition.country}</span>
                        ) : null}
                      </Link>
                    ))
                  ) : (
                    <p className={styles.railMuted}>{dictionary.noData}</p>
                  )}
                </div>
              </div>
            </section>

            <section className={styles.railCard}>
              <div className={styles.railSection}>
                <div className={styles.inlineBadgeRow}>
                  <h2 className={styles.railSectionTitle}>{dictionary.pinnedCompetitions}</h2>
                  <span className={styles.badge}>{formattedPinnedCount}</span>
                </div>
                <div className={styles.railList}>
                  {pinnedCompetitions.length ? (
                    pinnedCompetitions.map((competition) => (
                      <Link
                        key={competition.code}
                        href={`/${locale}/leagues/${competition.code}`}
                        className={styles.railLink}
                      >
                        <span>{competition.name}</span>
                        {competition.country ? (
                          <span className={styles.badge}>{competition.country}</span>
                        ) : null}
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
                <div className={styles.inlineBadgeRow}>
                  <h2 className={styles.railSectionTitle}>{dictionary.myTeams}</h2>
                  <span className={styles.badge}>{formattedTeamCount}</span>
                </div>
                <div className={styles.railList}>
                  {savedTeams.length ? (
                    savedTeams.map((team) => (
                      <Link key={team.id} href={`/${locale}/teams/${team.id}`} className={styles.railLink}>
                        <span>{team.name}</span>
                        {team.leagueName ? (
                          <span className={styles.badge}>{team.leagueName}</span>
                        ) : null}
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
                <div className={styles.inlineBadgeRow}>
                  <h2 className={styles.railSectionTitle}>{dictionary.recentItemsTitle}</h2>
                  <span className={styles.badge}>{formatCount(locale, recentItems.length)}</span>
                </div>
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
                <div className={styles.inlineBadgeRow}>
                  <h2 className={styles.railSectionTitle}>{dictionary.countries}</h2>
                  <span className={styles.badge}>{formatCount(locale, countryGroups.length)}</span>
                </div>
                <div className={styles.railList}>
                  {countryGroups.map((group) => (
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

          <div className={styles.centerRail}>
            {children}
          </div>

          <aside className={styles.rightRail}>
            {supportEnabled ? (
              <section className={`${styles.railCard} ${styles.railPromoCard}`}>
                <div className={styles.railSection}>
                  <div className={styles.inlineBadgeRow}>
                    <h2 className={styles.railSectionTitle}>{dictionary.supportRail}</h2>
                    <span className={styles.badge}>{localeLabel}</span>
                  </div>
                  <p className={styles.railMuted}>{dictionary.supportRailBody}</p>
                  <div className={styles.inlineBadgeRow}>
                    <Link href={`/${locale}/search`} className={styles.sectionAction}>
                      {dictionary.search}
                    </Link>
                    <Link href={`/${locale}/favorites`} className={styles.sectionAction}>
                      {dictionary.favorites}
                    </Link>
                    <Link href={`/${locale}/settings`} className={styles.sectionAction}>
                      {dictionary.metaSettingsTitle}
                    </Link>
                  </div>
                </div>
              </section>
            ) : null}

            {adSlotEnabled ? (
              <section className={styles.railCard}>
                <div className={styles.railSection}>
                  <div className={styles.inlineBadgeRow}>
                    <h2 className={styles.railSectionTitle}>{dictionary.adSlot}</h2>
                    {shellChrome.adSlot?.placement ? (
                      <span className={styles.badge}>{shellChrome.adSlot.placement}</span>
                    ) : null}
                    {shellChrome.adSlot?.size ? (
                      <span className={styles.badge}>{shellChrome.adSlot.size}</span>
                    ) : null}
                  </div>
                  <div className={styles.adSlot}>{adSlotCopy}</div>
                  {shellChrome.adSlot?.ctaLabel && shellChrome.adSlot?.ctaUrl ? (
                    <a
                      href={shellChrome.adSlot.ctaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.sectionAction}
                    >
                      {shellChrome.adSlot.ctaLabel}
                    </a>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className={styles.railCard}>
              <div className={styles.railSection}>
                <div className={styles.inlineBadgeRow}>
                  <h2 className={styles.railSectionTitle}>{dictionary.affiliatesPartnerTitle}</h2>
                  <span className={styles.badge}>{currentGeoLabel}</span>
                </div>
                <p className={styles.railMuted}>{dictionary.affiliatesLead}</p>
                <div className={styles.surfaceRowsCompact}>
                  <div className={styles.selectionCard}>
                    <strong className={styles.cardTitle}>{dictionary.affiliatesPartnerTitle}</strong>
                    <p className={styles.railMuted}>
                      {affiliatePartner || dictionary.affiliatesPartnerPending}
                    </p>
                  </div>
                  <div className={styles.selectionCard}>
                    <strong className={styles.cardTitle}>{dictionary.affiliatesBookmakerTitle}</strong>
                    <p className={styles.railMuted}>
                      {bookmakerSummary || dictionary.affiliatesBookmakerPending}
                    </p>
                  </div>
                </div>
                <Link href={`/${locale}/affiliates`} className={styles.sectionAction}>
                  {dictionary.metaAffiliatesTitle}
                </Link>
              </div>
            </section>

            {consentEnabled ? (
              <section className={styles.railCard}>
                <div className={styles.railSection}>
                  <div className={styles.inlineBadgeRow}>
                    <h2 className={styles.railSectionTitle}>{consentTitle}</h2>
                    <span className={styles.badge}>
                      {dictionary.currentMarket}: {currentGeoLabel}
                    </span>
                    <span className={styles.badge}>{formattedMarketCount}</span>
                  </div>
                  <p className={styles.railMuted}>{consentBody}</p>
                  {launchMarketLabels.length ? (
                    <div className={styles.inlineBadgeRow}>
                      {launchMarketLabels.map((label) => (
                        <span key={label} className={styles.badge}>
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {compliance.regulatedCopyRequired ? (
                    <div className={styles.surfaceRowsCompact}>
                      {legalNotices.map((notice) => (
                        <span key={notice} className={styles.infoBanner}>
                          {notice}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {funnelEnabled ? (
              <section className={styles.railCard}>
                <div className={styles.railSection}>
                  <div className={styles.inlineBadgeRow}>
                    <h2 className={styles.railSectionTitle}>{dictionary.funnelRailTitle}</h2>
                    <span className={styles.badge}>{currentGeoLabel}</span>
                  </div>
                  <p className={styles.railMuted}>{dictionary.funnelRailBody}</p>
                  {affiliatePartner ? (
                    <p className={styles.railMuted}>
                      {dictionary.affiliatePartnerLabel}: {affiliatePartner}
                    </p>
                  ) : null}
                  {bookmakerSummary ? (
                    <p className={styles.railMuted}>
                      {dictionary.affiliatesBookmakerTitle}: {bookmakerSummary}
                    </p>
                  ) : null}
                  {funnelActions.length && compliance.promptOptInAllowed ? (
                    promptPreferences.funnelPrompts ? (
                      <div className={styles.inlineBadgeRow}>
                        {funnelActions.map((action) => (
                          <a
                            key={action.key}
                            href={action.url}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.sectionAction}
                          >
                            {action.key === "telegram"
                              ? dictionary.openTelegram
                              : dictionary.openWhatsApp}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.railSection}>
                        <p className={styles.railMuted}>{dictionary.funnelOptInLead}</p>
                        <div className={styles.inlineBadgeRow}>
                          <button
                            type="button"
                            className={styles.sectionAction}
                            onClick={() => setPromptPreference("funnelPrompts", true)}
                          >
                            {dictionary.enableFunnelPrompts}
                          </button>
                          <Link href={`/${locale}/settings`} className={styles.sectionAction}>
                            {dictionary.metaSettingsTitle}
                          </Link>
                        </div>
                      </div>
                    )
                  ) : funnelActions.length ? (
                    <p className={styles.railMuted}>{dictionary.promptOptInUnavailable}</p>
                  ) : (
                    <div className={styles.inlineBadgeRow}>
                      <p className={styles.railMuted}>{dictionary.funnelUnavailable}</p>
                    </div>
                  )}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerContent}>
            <div className={styles.footerGrid}>
              <section className={styles.footerLead}>
                <div className={styles.footerBrandRow}>
                  <div className={styles.footerBrandMark} aria-hidden="true">
                    SP
                  </div>
                  <div className={styles.footerBrandCopy}>
                    <strong className={styles.footerBrandTitle}>{dictionary.brand}</strong>
                    <p className={styles.footerSummary}>{dictionary.footerSummary}</p>
                  </div>
                </div>

                <div className={styles.footerMeta}>
                  <span className={styles.badge}>
                    {dictionary.currentMarket}: {currentGeoLabel}
                  </span>
                  <span className={styles.badge}>
                    {dictionary.locale}: {localeLabel}
                  </span>
                  <span className={styles.badge}>
                    {dictionary.theme}: {activeThemeLabel}
                  </span>
                  {affiliatePartner ? (
                    <span className={styles.badge}>
                      {dictionary.affiliatePartnerLabel}: {affiliatePartner}
                    </span>
                  ) : null}
                  <span className={styles.badge}>{accountLabel}</span>
                </div>
              </section>

              <section className={styles.footerPanel}>
                <h2 className={styles.footerHeading}>{dictionary.browse}</h2>
                <div className={styles.footerActions}>
                  <Link href={`/${locale}/search`} className={styles.sectionAction}>
                    {dictionary.search}
                  </Link>
                  <Link href={`/${locale}/favorites`} className={styles.sectionAction}>
                    {dictionary.favorites}
                  </Link>
                  <Link href={`/${locale}/settings`} className={styles.sectionAction}>
                    {dictionary.metaSettingsTitle}
                  </Link>
                  <Link href={accountHref} className={styles.sectionAction}>
                    {accountLabel}
                  </Link>
                  <Link href={modeSwitchLink.href} className={styles.sectionAction}>
                    {modeSwitchLink.label}
                  </Link>
                </div>
              </section>

              <section className={styles.footerPanel}>
                <h2 className={styles.footerHeading}>{dictionary.favorites}</h2>
                <div className={styles.footerStatGrid}>
                  <div className={styles.footerStatCard}>
                    <span>{dictionary.watchlist}</span>
                    <strong>{formattedWatchCount}</strong>
                  </div>
                  <div className={styles.footerStatCard}>
                    <span>{dictionary.pinnedCompetitions}</span>
                    <strong>{formattedPinnedCount}</strong>
                  </div>
                  <div className={styles.footerStatCard}>
                    <span>{dictionary.myTeams}</span>
                    <strong>{formattedTeamCount}</strong>
                  </div>
                  <div className={styles.footerStatCard}>
                    <span>{dictionary.currentMarket}</span>
                    <strong>{currentGeoLabel}</strong>
                  </div>
                </div>
              </section>

              <section className={styles.footerPanel}>
                <h2 className={styles.footerHeading}>{dictionary.consent}</h2>
                <div className={styles.footerStatGrid}>
                  <div className={styles.footerStatCard}>
                    <span>{dictionary.locale}</span>
                    <strong>{localeLabel}</strong>
                  </div>
                  <div className={styles.footerStatCard}>
                    <span>{dictionary.theme}</span>
                    <strong>{activeThemeLabel}</strong>
                  </div>
                  <div className={styles.footerStatCard}>
                    <span>{dictionary.countries}</span>
                    <strong>{formattedMarketCount}</strong>
                  </div>
                  <div className={styles.footerStatCard}>
                    <span>{dictionary.sports}</span>
                    <strong>{formattedSportCount}</strong>
                  </div>
                </div>
                <div className={styles.inlineBadgeRow}>
                  {legalNotices.map((notice) => (
                    <span key={notice} className={styles.badge}>
                      {notice}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </footer>
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
      <ShellFrame
        locale={locale}
        viewerGeo={viewerGeo}
        dictionary={dictionary}
        watchlistItems={initialWatchlist}
        shellData={shellData}
      >
        {children}
      </ShellFrame>
    </PreferencesProvider>
  );
}
