"use client";

import { useState } from "react";
import styles from "./onboarding-panel.module.css";
import { usePreferences } from "./preferences-provider";
import { trackProductAnalyticsEvent } from "../../lib/product-analytics";

function toggleSelection(items, value) {
  return items.includes(value) ? items.filter((entry) => entry !== value) : [...items, value];
}

export function OnboardingPanel({
  locale,
  dictionary,
  sportOptions = [],
  competitionOptions = [],
  teamOptions = [],
}) {
  const {
    compliance,
    favoriteSports,
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
  const [selectedCompetitions, setSelectedCompetitions] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [optInReminders, setOptInReminders] = useState(
    Boolean(promptPreferences?.reminderPrompts)
  );
  const [optInFunnels, setOptInFunnels] = useState(Boolean(promptPreferences?.funnelPrompts));
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
      promptPreferences: {
        ...current.promptPreferences,
        reminderPrompts: compliance.promptOptInAllowed ? optInReminders : false,
        funnelPrompts: compliance.promptOptInAllowed ? optInFunnels : false,
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
        reminderPrompts: compliance.promptOptInAllowed ? optInReminders : false,
        funnelPrompts: compliance.promptOptInAllowed ? optInFunnels : false,
        authenticated: Boolean(sessionUser),
      },
    });

    setSaving(false);
  }

  async function handleDismiss() {
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
            {competitionOptions.slice(0, 8).map((competition) => {
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
                  {competition.country ? <small>{competition.country}</small> : null}
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
            {teamOptions.slice(0, 10).map((team) => {
              const selected = selectedTeams.includes(team.id);

              return (
                <button
                  key={team.id}
                  type="button"
                  className={selected ? styles.choiceButtonActive : styles.choiceButton}
                  onClick={() => setSelectedTeams((current) => toggleSelection(current, team.id))}
                >
                  <span>{team.name}</span>
                  {team.leagueName ? <small>{team.leagueName}</small> : null}
                </button>
              );
            })}
          </div>
        </article>

        <article className={styles.column}>
          <div className={styles.columnHeader}>
            <h3>{dictionary.onboardingPrompts}</h3>
            <span>{compliance.promptOptInAllowed ? 2 : 0}</span>
          </div>
          {compliance.promptOptInAllowed ? (
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
