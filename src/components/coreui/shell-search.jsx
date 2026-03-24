"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { closeSearch, openSearch } from "../../lib/store";
import { formatFixtureStatus } from "../../lib/coreui/format";
import { trackProductAnalyticsEvent } from "../../lib/product-analytics";
import { SearchResultsSection } from "./search-results";
import { ShellIcon } from "./shell-icons";
import { usePreferences } from "./preferences-provider";
import styles from "./styles.module.css";
import searchStyles from "./search-experience.module.css";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: start center;
  padding: 5rem 1rem 1rem;
  background: var(--overlay-backdrop);
  backdrop-filter: blur(10px);
`;

function getShortcutTypeLabel(type, dictionary) {
  const labels = {
    sport: dictionary.sports,
    country: dictionary.countries,
    competition: dictionary.competition,
    team: dictionary.teams,
    fixture: dictionary.match,
  };

  return labels[type] || type;
}

function mapRecentItems(locale, dictionary, shellData, recentViews = []) {
  const featuredCompetitions = [
    ...(shellData?.featuredCompetitions || []),
    ...((shellData?.countryGroups || []).flatMap((group) =>
      group.leagues.map((competition) => ({
        ...competition,
        country: competition.country || group.country,
      }))
    )),
  ];
  const competitionMap = new Map(
    featuredCompetitions.map((competition) => [competition.code, competition])
  );
  const teamMap = new Map((shellData?.teamDirectory || []).map((team) => [team.id, team]));
  const fixtureMap = new Map((shellData?.fixtureDirectory || []).map((fixture) => [fixture.id, fixture]));

  return recentViews
    .map((itemId) => {
      const [prefix, entityId] = String(itemId || "").split(":");

      if (prefix === "competition") {
        const competition = competitionMap.get(entityId);
        if (!competition) {
          return null;
        }

        return {
          key: itemId,
          title: competition.name,
          subtitle: competition.country || dictionary.competition,
          href: `/${locale}/leagues/${competition.code}`,
        };
      }

      if (prefix === "team") {
        const team = teamMap.get(entityId);
        if (!team) {
          return null;
        }

        return {
          key: itemId,
          title: team.name,
          subtitle: team.leagueName || dictionary.teams,
          href: `/${locale}/teams/${team.id}`,
        };
      }

      if (prefix === "fixture") {
        const fixture = fixtureMap.get(entityId);
        if (!fixture) {
          return null;
        }

        return {
          key: itemId,
          title: fixture.label,
          subtitle: [fixture.leagueName, formatFixtureStatus(fixture.status, locale)]
            .filter(Boolean)
            .join(" | "),
          href: `/${locale}/match/${fixture.externalRef || fixture.id}`,
        };
      }

      return null;
    })
    .filter(Boolean)
    .slice(0, 6);
}

export function ShellSearch({ dictionary, locale, shortcuts, shellData }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchOpen = useSelector((state) => state.shell.searchOpen);
  const { recentViews } = usePreferences();
  const searchInputRef = useRef(null);
  const trackedQueryRef = useRef("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const deferredQuery = useDeferredValue(query);
  const recentItems = useMemo(
    () => mapRecentItems(locale, dictionary, shellData, recentViews),
    [dictionary, locale, recentViews, shellData]
  );
  const topCompetitions = (shellData?.featuredCompetitions || []).slice(0, 6);
  const normalizedQuery = deferredQuery.trim();
  const loading =
    searchOpen &&
    normalizedQuery.length >= 2 &&
    searchResults?.query !== normalizedQuery;

  const resetSearch = useCallback(() => {
    setQuery("");
    setSearchResults(null);
    trackedQueryRef.current = "";
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const inEditableSurface =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

      if (
        !inEditableSurface &&
        ((event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) ||
          ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"))
      ) {
        event.preventDefault();
        resetSearch();
        dispatch(openSearch());
        return;
      }

      if (!searchOpen) {
        return;
      }

      if (event.key === "Escape") {
        dispatch(closeSearch());
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, resetSearch, searchOpen]);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) {
      return undefined;
    }

    if (normalizedQuery.length < 2) {
      trackedQueryRef.current = "";
      return undefined;
    }

    const controller = new AbortController();

    fetch(
      `/api/search?q=${encodeURIComponent(normalizedQuery)}&locale=${encodeURIComponent(locale)}&limit=5`,
      {
        signal: controller.signal,
      }
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (controller.signal.aborted || !payload) {
          return;
        }

        setSearchResults(payload);

        if (trackedQueryRef.current !== normalizedQuery) {
          trackedQueryRef.current = normalizedQuery;

          trackProductAnalyticsEvent({
            event: "search_query",
            surface: "shell-search",
            query: normalizedQuery,
            metadata: {
              total: payload.summary?.total || 0,
              counts: payload.summary?.counts || {},
            },
          });

          if (!payload.summary?.total) {
            trackProductAnalyticsEvent({
              event: "search_zero_results",
              surface: "shell-search",
              query: normalizedQuery,
            });
          }
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [locale, normalizedQuery, searchOpen]);

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      return;
    }

    router.push(`/${locale}/search?q=${encodeURIComponent(trimmedQuery)}`);
    dispatch(closeSearch());
  }

  function handleOpen() {
    resetSearch();
    dispatch(openSearch());
  }

  function handleClose() {
    resetSearch();
    dispatch(closeSearch());
  }

  return (
    <>
      <button
        type="button"
        aria-label={dictionary.search}
        className={`${styles.sectionAction} ${styles.headerAction}`}
        onClick={handleOpen}
      >
        <ShellIcon name="search" className={styles.controlIcon} />
        <span className={styles.headerActionLabel}>{dictionary.search}</span>
      </button>

      {searchOpen ? (
        <Overlay onClick={handleClose}>
          <div className={searchStyles.overlayPanel} onClick={(event) => event.stopPropagation()}>
            <div className={searchStyles.overlaySearchBar}>
              <form className={searchStyles.overlaySearchForm} onSubmit={handleSubmit}>
                <ShellIcon name="search" className={styles.controlIcon} />
                <input
                  ref={searchInputRef}
                  type="search"
                  className={searchStyles.overlaySearchInput}
                  placeholder={dictionary.searchPlaceholder}
                  aria-label={dictionary.search}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <div className={searchStyles.overlaySearchActions}>
                  {loading ? <span className={searchStyles.overlaySpinner}>...</span> : null}
                  <button type="submit" className={searchStyles.overlaySearchSubmit}>
                    {dictionary.searchViewResults}
                  </button>
                </div>
              </form>

              <div className={searchStyles.overlaySearchHint}>
                <span>{dictionary.searchHelp}</span>
                <span>{dictionary.searchShortcutHint}</span>
              </div>
            </div>

            <div className={searchStyles.overlayBody}>
              {query.trim().length >= 2 ? (
                <div className={searchStyles.overlaySections}>
                  {searchResults?.degraded ? (
                    <div className={searchStyles.emptyState}>
                      {dictionary.searchDegradedMessage}
                    </div>
                  ) : null}

                  {searchResults?.topResults?.length ? (
                    <SearchResultsSection
                      title={dictionary.searchTopResults}
                      locale={locale}
                      dictionary={dictionary}
                      results={searchResults.topResults}
                      surface="shell-search"
                      query={searchResults.query}
                      compact
                      onResultClick={handleClose}
                    />
                  ) : !loading ? (
                    <div className={searchStyles.emptyState}>{dictionary.searchNoResults}</div>
                  ) : null}

                  {searchResults?.sections?.competitions?.length ? (
                    <SearchResultsSection
                      title={dictionary.searchCompetitions}
                      locale={locale}
                      dictionary={dictionary}
                      results={searchResults.sections.competitions}
                      surface="shell-search"
                      query={searchResults.query}
                      compact
                      onResultClick={handleClose}
                    />
                  ) : null}

                  {searchResults?.sections?.teams?.length ? (
                    <SearchResultsSection
                      title={dictionary.searchTeams}
                      locale={locale}
                      dictionary={dictionary}
                      results={searchResults.sections.teams}
                      surface="shell-search"
                      query={searchResults.query}
                      compact
                      onResultClick={handleClose}
                    />
                  ) : null}

                  {searchResults?.sections?.matches?.length ? (
                    <SearchResultsSection
                      title={dictionary.searchMatches}
                      locale={locale}
                      dictionary={dictionary}
                      results={searchResults.sections.matches}
                      surface="shell-search"
                      query={searchResults.query}
                      compact
                      onResultClick={handleClose}
                    />
                  ) : null}
                </div>
              ) : (
                <div className={searchStyles.discoveryGrid}>
                  <section className={searchStyles.discoveryPanel}>
                    <div className={styles.sectionHeader}>
                      <div>
                        <p className={styles.eyebrow}>{dictionary.recent}</p>
                        <h2 className={styles.sectionTitle}>{dictionary.searchRecentItems}</h2>
                      </div>
                    </div>

                    {recentItems.length ? (
                      <div className={searchStyles.discoveryList}>
                        {recentItems.map((item) => (
                          <Link
                            key={item.key}
                            href={item.href}
                            className={searchStyles.discoveryLink}
                            onClick={handleClose}
                          >
                            <span className={searchStyles.discoveryLabel}>
                              <strong>{item.title}</strong>
                              <span className={searchStyles.discoveryMeta}>{item.subtitle}</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className={searchStyles.emptyState}>{dictionary.searchRecentEmpty}</p>
                    )}
                  </section>

                  <section className={searchStyles.discoveryPanel}>
                    <div className={styles.sectionHeader}>
                      <div>
                        <p className={styles.eyebrow}>{dictionary.leagues}</p>
                        <h2 className={styles.sectionTitle}>{dictionary.searchTopCompetitions}</h2>
                      </div>
                    </div>

                    <div className={searchStyles.discoveryList}>
                      {topCompetitions.map((competition) => (
                        <Link
                          key={competition.code}
                          href={`/${locale}/leagues/${competition.code}`}
                          className={searchStyles.discoveryLink}
                          onClick={handleClose}
                        >
                          <span className={searchStyles.discoveryLabel}>
                            <strong>{competition.name}</strong>
                            <span className={searchStyles.discoveryMeta}>{competition.country}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>

                  <section className={searchStyles.discoveryPanel}>
                    <div className={styles.sectionHeader}>
                      <div>
                        <p className={styles.eyebrow}>{dictionary.browse}</p>
                        <h2 className={styles.sectionTitle}>{dictionary.searchShortcutsTitle}</h2>
                      </div>
                    </div>

                    <div className={searchStyles.discoveryList}>
                      {shortcuts.map((shortcut) => (
                        <Link
                          key={`${shortcut.type}:${shortcut.href}`}
                          href={`/${locale}${shortcut.href}`}
                          className={searchStyles.discoveryLink}
                          onClick={handleClose}
                        >
                          <span className={searchStyles.discoveryLabel}>
                            <strong>{shortcut.label}</strong>
                            <span className={searchStyles.discoveryMeta}>
                              {getShortcutTypeLabel(shortcut.type, dictionary)}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        </Overlay>
      ) : null}
    </>
  );
}
