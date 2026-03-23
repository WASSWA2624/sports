"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LOCALE_LABELS } from "../../lib/coreui/config";
import { SUPPORTED_LOCALES } from "../../lib/coreui/preferences";
import styles from "./profile.module.css";

const defaultPreferences = {
  locale: "en",
  theme: "system",
  timezone: "UTC",
  favoriteSports: [],
  alertPreferences: {
    goals: true,
    cards: false,
    kickoff: true,
    periodChange: false,
    finalResult: true,
  },
};

export default function ProfileClient({ dictionary, locale }) {
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState(null);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const [meRes, prefsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/profile/preferences"),
        ]);

        if (!meRes.ok) {
          setMessage(dictionary.profileNotSignedIn);
          return;
        }

        const meJson = await meRes.json();
        setSessionUser(meJson.user);

        if (prefsRes.ok) {
          const prefsJson = await prefsRes.json();
          setPreferences({
            locale: prefsJson.locale ?? locale,
            theme: prefsJson.theme ?? "system",
            timezone: prefsJson.timezone ?? "UTC",
            favoriteSports: prefsJson.favoriteSports ?? [],
            alertPreferences:
              prefsJson.alertPreferences ?? {
                goals: true,
                cards: false,
                kickoff: true,
                periodChange: false,
                finalResult: true,
              },
          });
        }
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [dictionary.profileNotSignedIn, locale]);

  async function handleSavePreferences(event) {
    event.preventDefault();
    setMessage("");

    const response = await fetch("/api/profile/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(preferences),
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || dictionary.profileSaveFailed);
      return;
    }

    setMessage(dictionary.profileSaved);
  }

  if (loading) {
    return <main className={styles.statusPage}>{dictionary.profileLoading}</main>;
  }

  if (!sessionUser) {
    return <main className={styles.statusPage}>{dictionary.profileAuthRequired}</main>;
  }

  const alertLabels = [
    ["goals", dictionary.profileAlertGoals],
    ["cards", dictionary.profileAlertCards],
    ["kickoff", dictionary.profileAlertKickoff],
    ["periodChange", dictionary.profileAlertPeriodChange],
    ["finalResult", dictionary.profileAlertFinalResult],
  ];

  return (
    <main className={styles.profilePage}>
      <section className={styles.profileCard}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{dictionary.profile}</p>
            <h1 className={styles.title}>{dictionary.profileTitle}</h1>
          </div>
          <div className={styles.accountMeta}>
            <p className={styles.copy}>
              {dictionary.profileSignedInAs} <strong>{sessionUser.email}</strong>
            </p>
            <p className={styles.copy}>
              {dictionary.profileRoles}: {sessionUser.roles.join(", ")}
            </p>
          </div>

          {sessionUser.roles.some((role) => ["EDITOR", "ADMIN"].includes(role)) ? (
            <div className={styles.quickLinks}>
              <Link href={`/${locale}/news/manage`} className={styles.quickLink}>
                {dictionary.newsManage}
              </Link>
              {sessionUser.roles.includes("ADMIN") ? (
                <Link href={`/${locale}/admin`} className={styles.quickLink}>
                  Admin control room
                </Link>
              ) : null}
            </div>
          ) : null}
        </header>

        <form className={styles.form} onSubmit={handleSavePreferences}>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>{dictionary.profileLocale}</span>
              <select
                value={preferences.locale}
                onChange={(event) =>
                  setPreferences((prev) => ({ ...prev, locale: event.target.value }))
                }
              >
                {SUPPORTED_LOCALES.map((item) => (
                  <option key={item} value={item}>
                    {LOCALE_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>{dictionary.profileTheme}</span>
              <select
                value={preferences.theme}
                onChange={(event) =>
                  setPreferences((prev) => ({ ...prev, theme: event.target.value }))
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
                value={preferences.timezone}
                onChange={(event) =>
                  setPreferences((prev) => ({ ...prev, timezone: event.target.value }))
                }
              />
            </label>

            <label className={styles.field}>
              <span>{dictionary.profileFavoriteSports}</span>
              <input
                value={preferences.favoriteSports.join(", ")}
                onChange={(event) =>
                  setPreferences((prev) => ({
                    ...prev,
                    favoriteSports: event.target.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </label>
          </div>

          <fieldset className={styles.fieldset}>
            <legend>{dictionary.profileAlerts}</legend>
            <div className={styles.alertList}>
              {alertLabels.map(([key, label]) => (
                <label key={key} className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.alertPreferences[key])}
                    onChange={(event) =>
                      setPreferences((prev) => ({
                        ...prev,
                        alertPreferences: {
                          ...prev.alertPreferences,
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

          <div className={styles.actions}>
            <button type="submit" className={styles.saveButton}>
              {dictionary.profileSave}
            </button>
            {message ? <p className={styles.message}>{message}</p> : null}
          </div>
        </form>
      </section>
    </main>
  );
}
