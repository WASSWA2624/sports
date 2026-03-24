"use client";

import { useState, useSyncExternalStore } from "react";
import styles from "./onboarding-panel.module.css";
import { usePreferences } from "./preferences-provider";
import { trackProductAnalyticsEvent } from "../../lib/product-analytics";

const ONBOARDING_STORAGE_KEY = "sports:onboarding:completed";
const ONBOARDING_DISMISS_KEY = "sports:onboarding:dismissed";
const ONBOARDING_STORAGE_EVENT = "sports:onboarding-storage";

function toggleSelection(items, value) {
  return items.includes(value) ? items.filter((entry) => entry !== value) : [...items, value];
}

function readDismissedByStorage() {
  if (typeof window === "undefined") {
    return true;
  }

  return (
    window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1" ||
    window.localStorage.getItem(ONBOARDING_DISMISS_KEY) === "1"
  );
}

function subscribeToOnboardingStorage(onStoreChange) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(ONBOARDING_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(ONBOARDING_STORAGE_EVENT, onStoreChange);
  };
}

export function OnboardingPanel({
  locale,
  dictionary,
  sportOptions = [],
  competitionOptions = [],
  teamOptions = [],
}) {
  const {
    favoriteSports,
    watchlist,
    sessionUser,
    setFavoriteSports,
    addFavoriteItems,
  } = usePreferences();
  const dismissedByStorage = useSyncExternalStore(
    subscribeToOnboardingStorage,
    readDismissedByStorage,
    () => true
  );
  const [saving, setSaving] = useState(false);
  const [selectedSports, setSelectedSports] = useState(favoriteSports || []);
  const [selectedCompetitions, setSelectedCompetitions] = useState(
    (watchlist || [])
      .filter((itemId) => itemId.startsWith("competition:"))
      .map((itemId) => itemId.split(":")[1])
  );
  const [selectedTeams, setSelectedTeams] = useState(
    (watchlist || [])
      .filter((itemId) => itemId.startsWith("team:"))
      .map((itemId) => itemId.split(":")[1])
  );
  const dismissed =
    dismissedByStorage || Boolean((watchlist || []).length || (favoriteSports || []).length);

  if (dismissed) {
    return null;
  }

  async function handleSave() {
    const favoriteItemIds = [
      ...selectedCompetitions.map((code) => `competition:${code}`),
      ...selectedTeams.map((teamId) => `team:${teamId}`),
    ];

    setSaving(true);
    await setFavoriteSports(selectedSports, { silent: true });
    await addFavoriteItems(favoriteItemIds, { surface: "home-onboarding" });
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
    window.localStorage.removeItem(ONBOARDING_DISMISS_KEY);
    window.dispatchEvent(new Event(ONBOARDING_STORAGE_EVENT));

    trackProductAnalyticsEvent({
      event: "onboarding_completed",
      surface: "home-onboarding",
      metadata: {
        locale,
        sportCount: selectedSports.length,
        competitionCount: selectedCompetitions.length,
        teamCount: selectedTeams.length,
        authenticated: Boolean(sessionUser),
      },
    });

    setSaving(false);
  }

  function handleDismiss() {
    window.localStorage.setItem(ONBOARDING_DISMISS_KEY, "1");
    window.dispatchEvent(new Event(ONBOARDING_STORAGE_EVENT));
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
              const selected = selectedSports.includes(sport.slug || sport.code);
              const value = sport.slug || sport.code;

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
