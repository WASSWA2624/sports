"use client";

import { useMemo, useState } from "react";
import styles from "./onboarding-panel.module.css";
import { usePreferences } from "./preferences-provider";
import { trackProductAnalyticsEvent } from "../../lib/product-analytics";
import { LAUNCH_MARKET_GEOS } from "../../lib/coreui/route-context";

function toggleSelection(items, value) {
  return items.includes(value) ? items.filter((entry) => entry !== value) : [...items, value];
}

export function OnboardingPanel({
  locale,
  dictionary,
  sportOptions = [],
  competitionOptions = [],
  teamOptions = [],
  geoOptions = [],
}) {
  const {
    compliance,
    favoriteSports,
    marketPreferences,
    onboardingState,
    promptPreferences,
    sessionUser,
    updateProfilePreferences,
    addFavoriteItems,
    dismissOnboarding,
    watchlist,
  } = usePreferences();
  const [saving, setSaving] = useState(false);
  const [selectedSports, setSelectedSports] = useState(favoriteSports || []);
  const [selectedGeo, setSelectedGeo] = useState(
    marketPreferences?.preferredGeo || "INTL"
  );
  const [selectedCompetitions, setSelectedCompetitions] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [optInReminders, setOptInReminders] = useState(
    Boolean(promptPreferences?.reminderPrompts)
  );
  const [optInFunnels, setOptInFunnels] = useState(Boolean(promptPreferences?.funnelPrompts));
  const promptOptInAllowed =
    compliance.promptOptInAllowed || LAUNCH_MARKET_GEOS.includes(selectedGeo);
  const filteredCompetitions = useMemo(() => {
    if (!selectedSports.length) {
      return competitionOptions.slice(0, 8);
    }

    const selectedSportSet = new Set(selectedSports);
    const prioritized = competitionOptions.filter((competition) =>
      competition.sportCode ? selectedSportSet.has(competition.sportCode) : false
    );

    return (prioritized.length ? prioritized : competitionOptions).slice(0, 8);
  }, [competitionOptions, selectedSports]);
  const filteredTeams = useMemo(() => {
    if (!selectedSports.length) {
      return teamOptions.slice(0, 10);
    }

    const selectedSportSet = new Set(selectedSports);
    const prioritized = teamOptions.filter((team) =>
      team.sportCode ? selectedSportSet.has(team.sportCode) : false
    );

    return (prioritized.length ? prioritized : teamOptions).slice(0, 10);
  }, [selectedSports, teamOptions]);
  const dismissed =
    onboardingState?.completed ||
    onboardingState?.dismissed ||
    Boolean((watchlist || []).length) ||
    Boolean((favoriteSports || []).length);

  if (dismissed) {
    return null;
  }

  async function handleSave() {
    const favoriteItemIds = [
      ...selectedCompetitions.map((code) => `competition:${code}`),
      ...selectedTeams.map((teamId) => `team:${teamId}`),
    ];
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    setSaving(true);
    await updateProfilePreferences((current) => ({
      ...current,
      timezone: current.timezone === "UTC" ? detectedTimezone : current.timezone,
      favoriteSports: selectedSports,
      marketPreferences: {
        ...current.marketPreferences,
        preferredGeo: selectedGeo,
        bookmakerGeo: selectedGeo,
        ctaGeo: selectedGeo,
      },
      promptPreferences: {
        ...current.promptPreferences,
        reminderPrompts: promptOptInAllowed ? optInReminders : false,
        funnelPrompts: promptOptInAllowed ? optInFunnels : false,
      },
      onboardingState: {
        ...current.onboardingState,
        completed: true,
        dismissed: false,
        completedAt: new Date().toISOString(),
      },
    }));
    await addFavoriteItems(favoriteItemIds, { surface: "home-onboarding" });

    trackProductAnalyticsEvent({
      event: "onboarding_completed",
      surface: "home-onboarding",
      metadata: {
        locale,
        sportCount: selectedSports.length,
        competitionCount: selectedCompetitions.length,
        teamCount: selectedTeams.length,
        preferredGeo: selectedGeo,
        reminderPrompts: promptOptInAllowed ? optInReminders : false,
        funnelPrompts: promptOptInAllowed ? optInFunnels : false,
        authenticated: Boolean(sessionUser),
      },
    });

    setSaving(false);
  }

  async function handleDismiss() {
    trackProductAnalyticsEvent({
      event: "onboarding_dismissed",
      surface: "home-onboarding",
      metadata: {
        locale,
        authenticated: Boolean(sessionUser),
      },
    });
    await dismissOnboarding();
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{dictionary.search}</p>
          <h2 className={styles.title}>{dictionary.onboardingTitle}</h2>
          <p className={styles.lead}>{dictionary.onboardingLead}</p>
        </div>
        <button type="button" className={styles.dismissButton} onClick={handleDismiss}>
          {dictionary.onboardingSkip}
        </button>
      </div>

      <div className={styles.grid}>
        <article className={styles.column}>
          <div className={styles.columnHeader}>
            <h3>{dictionary.onboardingSports}</h3>
            <span>{selectedSports.length}</span>
          </div>
          <div className={styles.choiceGrid}>
            {sportOptions.map((sport) => {
              const value = sport.slug || sport.code;
              const selected = selectedSports.includes(value);

              return (
                <button
                  key={sport.id || value}
                  type="button"
                  className={selected ? styles.choiceButtonActive : styles.choiceButton}
                  onClick={() => setSelectedSports((current) => toggleSelection(current, value))}
                >
                  {sport.name}
                </button>
              );
            })}
          </div>
        </article>

        <article className={styles.column}>
          <div className={styles.columnHeader}>
            <h3>{dictionary.onboardingCompetitions}</h3>
            <span>{selectedCompetitions.length}</span>
          </div>
          <div className={styles.choiceGrid}>
            {filteredCompetitions.map((competition) => {
              const selected = selectedCompetitions.includes(competition.code);

              return (
                <button
                  key={competition.code}
                  type="button"
                  className={selected ? styles.choiceButtonActive : styles.choiceButton}
                  onClick={() =>
                    setSelectedCompetitions((current) => toggleSelection(current, competition.code))
                  }
                >
                  <span>{competition.name}</span>
                  <small>
                    {[competition.country, competition.sportName].filter(Boolean).join(" | ")}
                  </small>
                </button>
              );
            })}
          </div>
        </article>

        <article className={styles.column}>
          <div className={styles.columnHeader}>
            <h3>{dictionary.onboardingTeams}</h3>
            <span>{selectedTeams.length}</span>
          </div>
          <div className={styles.choiceGrid}>
            {filteredTeams.map((team) => {
              const selected = selectedTeams.includes(team.id);

              return (
                <button
                  key={team.id}
                  type="button"
                  className={selected ? styles.choiceButtonActive : styles.choiceButton}
                  onClick={() => setSelectedTeams((current) => toggleSelection(current, team.id))}
                >
                  <span>{team.name}</span>
                  <small>{[team.leagueName, team.country].filter(Boolean).join(" | ")}</small>
                </button>
              );
            })}
          </div>
        </article>

        <article className={styles.column}>
          <div className={styles.columnHeader}>
            <h3>{dictionary.onboardingPrompts}</h3>
            <span>{geoOptions.length + (promptOptInAllowed ? 2 : 0)}</span>
          </div>
          <div className={styles.choiceGrid}>
            {geoOptions.map((geo) => {
              const selected = selectedGeo === geo.code;

              return (
                <button
                  key={geo.code}
                  type="button"
                  className={selected ? styles.choiceButtonActive : styles.choiceButton}
                  onClick={() => setSelectedGeo(geo.code)}
                >
                  <span>{geo.label}</span>
                  <small>{dictionary.currentMarket}</small>
                </button>
              );
            })}
          </div>

          {promptOptInAllowed ? (
            <div className={styles.choiceGrid}>
              <button
                type="button"
                className={optInReminders ? styles.choiceButtonActive : styles.choiceButton}
                onClick={() => setOptInReminders((current) => !current)}
              >
                <span>{dictionary.onboardingReminderOptIn}</span>
                <small>{dictionary.onboardingReminderOptInBody}</small>
              </button>

              <button
                type="button"
                className={optInFunnels ? styles.choiceButtonActive : styles.choiceButton}
                onClick={() => setOptInFunnels((current) => !current)}
              >
                <span>{dictionary.onboardingFunnelOptIn}</span>
                <small>{dictionary.onboardingFunnelOptInBody}</small>
              </button>
            </div>
          ) : (
            <p className={styles.lead}>{dictionary.promptOptInUnavailable}</p>
          )}
        </article>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.saveButton} onClick={handleSave} disabled={saving}>
          {saving ? dictionary.onboardingSaving : dictionary.onboardingSave}
        </button>
        <p className={styles.hint}>{dictionary.onboardingHint}</p>
      </div>
    </section>
  );
}
