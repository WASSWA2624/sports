"use client";

import { startTransition, useEffect, useState } from "react";
import { getDictionary } from "../../lib/coreui/dictionaries";
import { formatKickoff } from "../../lib/coreui/format";
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

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId(tabs[0]?.id || null);
    }
  }, [activeTabId, tabs]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0] || null;
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
            className={tab.id === activeTabId ? styles.surfaceTabActive : styles.surfaceTabButton}
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
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
