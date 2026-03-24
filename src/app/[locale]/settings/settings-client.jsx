"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./settings-client.module.css";
import sharedStyles from "../../../components/coreui/styles.module.css";
import { SPORTS_STRIP } from "../../../lib/coreui/config";
import { getSportLabel } from "../../../lib/coreui/dictionaries";
import { GEO_LABELS, SUPPORTED_MARKET_GEOS } from "../../../lib/coreui/route-context";
import { usePreferences } from "../../../components/coreui/preferences-provider";

function toggleSport(list, sport) {
  return list.includes(sport) ? list.filter((entry) => entry !== sport) : [...list, sport];
}

export default function SettingsClient({ dictionary }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    compliance,
    profilePreferences,
    resetOnboarding,
    sessionUser,
    updateProfilePreferences,
  } = usePreferences();
  const [draft, setDraft] = useState(profilePreferences);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDraft(profilePreferences);
  }, [profilePreferences]);

  const sportOptions = SPORTS_STRIP.filter(
    (sport) => !["favorites", "more"].includes(sport.key)
  ).map((sport) => ({
    key: sport.key,
    label: getSportLabel(sport.key, dictionary),
  }));
  const alertLabels = [
    ["goals", dictionary.profileAlertGoals],
    ["cards", dictionary.profileAlertCards],
    ["kickoff", dictionary.profileAlertKickoff],
    ["periodChange", dictionary.profileAlertPeriodChange],
    ["finalResult", dictionary.profileAlertFinalResult],
    ["news", dictionary.profileAlertNews],
  ];

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const saved = await updateProfilePreferences(draft, { silent: true });
    if (!saved) {
      setMessage(dictionary.settingsSaveFailed);
      setSaving(false);
      return;
    }

    const segments = pathname.split("/").filter(Boolean);
    if (segments.length && draft.locale && segments[0] !== draft.locale) {
      segments[0] = draft.locale;
      router.replace(`/${segments.join("/")}`);
    } else {
      router.refresh();
    }

    setMessage(dictionary.settingsSaved);
    setSaving(false);
  }

  async function handleResetOnboarding() {
    await resetOnboarding({ silent: true });
    setMessage(dictionary.settingsOnboardingReset);
  }

  return (
    <div className={styles.page}>
      <section className={sharedStyles.pageHeader}>
        <div>
          <p className={sharedStyles.eyebrow}>{dictionary.settingsEyebrow}</p>
          <h1 className={sharedStyles.pageTitle}>{dictionary.settingsTitle}</h1>
          <p className={sharedStyles.pageLead}>{dictionary.settingsLead}</p>
        </div>
      </section>

      <section className={styles.panel}>
        <p className={styles.status}>
          {sessionUser ? dictionary.settingsAccountCopy : dictionary.settingsGuestCopy}
        </p>
        <p className={styles.note}>
          {dictionary.currentMarket}: {GEO_LABELS[compliance.effectiveGeo] || compliance.effectiveGeo}
        </p>
      </section>

      <form className={styles.panel} onSubmit={handleSave}>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>{dictionary.profileLocale}</span>
            <select
              value={draft.locale}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  locale: event.target.value,
                }))
              }
            >
              <option value="en">English</option>
              <option value="fr">Francais</option>
              <option value="sw">Kiswahili</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>{dictionary.profileTheme}</span>
            <select
              value={draft.theme}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  theme: event.target.value,
                }))
              }
            >
              <option value="system">{dictionary.themeSystem}</option>
              <option value="light">{dictionary.themeLight}</option>
              <option value="dark">{dictionary.themeDark}</option>
            </select>
          </label>
        </div>

        <div className={styles.grid}>
          <label className={styles.field}>
            <span>{dictionary.profileTimezone}</span>
            <input
              value={draft.timezone}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))
              }
            />
          </label>

          <label className={styles.field}>
            <span>{dictionary.settingsGeoPreference}</span>
            <select
              value={draft.marketPreferences.preferredGeo}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  marketPreferences: {
                    ...current.marketPreferences,
                    preferredGeo: event.target.value,
                  },
                }))
              }
            >
              {SUPPORTED_MARKET_GEOS.map((geo) => (
                <option key={geo} value={geo}>
                  {GEO_LABELS[geo] || geo}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.grid}>
          <label className={styles.field}>
            <span>{dictionary.settingsBookmakerGeo}</span>
            <select
              value={draft.marketPreferences.bookmakerGeo}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  marketPreferences: {
                    ...current.marketPreferences,
                    bookmakerGeo: event.target.value,
                  },
                }))
              }
            >
              {SUPPORTED_MARKET_GEOS.map((geo) => (
                <option key={geo} value={geo}>
                  {GEO_LABELS[geo] || geo}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>{dictionary.settingsCtaGeo}</span>
            <select
              value={draft.marketPreferences.ctaGeo}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  marketPreferences: {
                    ...current.marketPreferences,
                    ctaGeo: event.target.value,
                  },
                }))
              }
            >
              {SUPPORTED_MARKET_GEOS.map((geo) => (
                <option key={geo} value={geo}>
                  {GEO_LABELS[geo] || geo}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className={styles.fieldset}>
          <legend>{dictionary.profileFavoriteSports}</legend>
          <div className={styles.choiceGrid}>
            {sportOptions.map((sport) => {
              const active = draft.favoriteSports.includes(sport.key);

              return (
                <button
                  key={sport.key}
                  type="button"
                  className={active ? styles.choiceButtonActive : styles.choiceButton}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      favoriteSports: toggleSport(current.favoriteSports, sport.key),
                    }))
                  }
                >
                  {sport.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>{dictionary.profileAlerts}</legend>
          <div className={styles.checkList}>
            {alertLabels.map(([key, label]) => (
              <label key={key} className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={Boolean(draft.alertPreferences[key])}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      alertPreferences: {
                        ...current.alertPreferences,
                        [key]: event.target.checked,
                      },
                    }))
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>{dictionary.settingsPromptTitle}</legend>
          <div className={styles.checkList}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={Boolean(draft.promptPreferences.reminderPrompts)}
                disabled={!compliance.promptOptInAllowed}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    promptPreferences: {
                      ...current.promptPreferences,
                      reminderPrompts: event.target.checked,
                    },
                  }))
                }
              />
              <span>{dictionary.settingsReminderPrompts}</span>
            </label>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={Boolean(draft.promptPreferences.funnelPrompts)}
                disabled={!compliance.promptOptInAllowed}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    promptPreferences: {
                      ...current.promptPreferences,
                      funnelPrompts: event.target.checked,
                    },
                  }))
                }
              />
              <span>{dictionary.settingsFunnelPrompts}</span>
            </label>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={Boolean(draft.promptPreferences.bookmakerPrompts)}
                disabled={!compliance.bookmakerPromptAllowed}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    promptPreferences: {
                      ...current.promptPreferences,
                      bookmakerPrompts: event.target.checked,
                    },
                  }))
                }
              />
              <span>{dictionary.settingsBookmakerPrompts}</span>
            </label>
          </div>
          <p className={styles.note}>
            {compliance.promptOptInAllowed
              ? dictionary.settingsPromptHint
              : dictionary.promptOptInUnavailable}
          </p>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>{dictionary.settingsOnboardingTitle}</legend>
          <p className={styles.note}>{dictionary.settingsOnboardingHint}</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleResetOnboarding}
            >
              {dictionary.settingsResetOnboarding}
            </button>
          </div>
        </fieldset>

        <div className={styles.actions}>
          <button type="submit" className={styles.saveButton} disabled={saving}>
            {saving ? dictionary.onboardingSaving : dictionary.settingsSave}
          </button>
          {message ? <p className={styles.message}>{message}</p> : null}
        </div>
      </form>
    </div>
  );
}
