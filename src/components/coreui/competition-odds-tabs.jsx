"use client";

import { startTransition, useState } from "react";
import { getDictionary } from "../../lib/coreui/dictionaries";
import { formatKickoff } from "../../lib/coreui/format";
import { TrackedActionLink } from "./tracked-action-link";
import styles from "./styles.module.css";

function stateTone(state) {
  if (state === "available") {
    return styles.surfaceStateAvailable;
  }

  if (state === "stale") {
    return styles.surfaceStateStale;
  }

  if (state === "region_restricted") {
    return styles.surfaceStateRestricted;
  }

  return styles.surfaceStateUnavailable;
}

export function CompetitionOddsTabs({ tabs, locale }) {
  const dictionary = getDictionary(locale);
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id || null);
  const resolvedActiveTabId = tabs.some((tab) => tab.id === activeTabId)
    ? activeTabId
    : tabs[0]?.id || null;
  const activeTab = tabs.find((tab) => tab.id === resolvedActiveTabId) || tabs[0] || null;
  if (!activeTab) {
    return null;
  }

  return (
    <div className={styles.surfaceStack}>
      <div className={styles.surfaceTabList}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === resolvedActiveTabId ? styles.surfaceTabActive : styles.surfaceTabButton}
            data-analytics-action={`odds-tab:${tab.label}`}
            onClick={() => {
              startTransition(() => {
                setActiveTabId(tab.id);
              });
            }}
          >
            <span>{tab.label}</span>
            <span className={styles.filterCount}>{tab.rowCount}</span>
          </button>
        ))}
      </div>

      <div className={styles.surfaceRows}>
        {activeTab.rows.map((row) => (
          <article key={`${row.fixtureId}-${row.markets[0]?.id || row.fixtureRef}`} className={styles.detailCard}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>{row.fixtureLabel}</h3>
                <p className={styles.muted}>{formatKickoff(row.startsAt, locale)}</p>
              </div>
              <span className={stateTone(row.state)}>{row.stateLabel}</span>
            </div>

            <div className={styles.sourceList}>
              {row.sources.map((source) => (
                <span key={source} className={styles.legalChip}>
                  {source}
                </span>
              ))}
            </div>

            <div className={styles.surfaceRowsCompact}>
              {row.markets.map((market) => (
                <div key={market.id} className={styles.surfacePanel}>
                  <div className={styles.cardHeader}>
                    <strong>{market.bookmaker}</strong>
                    <span className={styles.badge}>
                      {market.suspended ? dictionary.marketSuspended : dictionary.marketOpen}
                    </span>
                  </div>
                  <div className={styles.selectionGrid}>
                    {market.selections.map((selection) => (
                      <div key={selection.id} className={styles.selectionCard}>
                        <strong>{selection.label}</strong>
                        {selection.line ? <span className={styles.muted}>{selection.lineLabel}</span> : null}
                        <span className={selection.isActive ? styles.summaryValue : styles.muted}>
                          {selection.priceLabel || "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                  {market.featuredSelection ? (
                    <div className={styles.insightSplit}>
                      <span className={styles.insightMetric}>
                        {dictionary.bestPrice}: {market.featuredSelection.label}
                      </span>
                      <strong className={styles.insightPrice}>{market.featuredSelection.priceLabel}</strong>
                    </div>
                  ) : null}
                  {market.cta?.href ? (
                    <TrackedActionLink
                      href={market.cta.href}
                      external={market.cta.external}
                      className={styles.actionLink}
                      analyticsEvent="odds_cta_click"
                      analyticsSurface="competition-odds-tabs"
                      analyticsEntityType="fixture"
                      analyticsEntityId={row.fixtureId}
                      analyticsAction={`competition-market:${market.bookmaker}`}
                      analyticsMetadata={{
                        fixtureId: row.fixtureId,
                        marketType: market.marketType,
                      }}
                      affiliateClick={market.cta}
                    >
                      {dictionary.betNow}
                    </TrackedActionLink>
                  ) : null}
                </div>
              ))}
            </div>
            {row.comparison?.bestPriceLabel ? (
              <div className={styles.insightMeta}>
                <span className={styles.insightMetric}>
                  {dictionary.bestPrice}: {row.comparison.bestPriceLabel}
                </span>
                {row.comparison.bestBookmaker ? (
                  <span className={styles.badge}>{row.comparison.bestBookmaker}</span>
                ) : null}
                {row.primaryCta?.href ? (
                  <TrackedActionLink
                    href={row.primaryCta.href}
                    external={row.primaryCta.external}
                    className={styles.sectionAction}
                    analyticsEvent="odds_cta_click"
                    analyticsSurface="competition-odds-tabs"
                    analyticsEntityType="fixture"
                    analyticsEntityId={row.fixtureId}
                    analyticsAction="competition-row-primary-affiliate"
                    analyticsMetadata={{
                      fixtureId: row.fixtureId,
                      bestSelection: row.comparison.bestSelectionLabel || null,
                    }}
                    affiliateClick={row.primaryCta}
                  >
                    {dictionary.betNow}
                  </TrackedActionLink>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
