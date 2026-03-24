"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import styles from "./auth-page.module.css";
import sharedStyles from "../../../components/coreui/styles.module.css";
import { usePreferences } from "../../../components/coreui/preferences-provider";

function buildDefaultFields() {
  return {
    identifier: "",
    password: "",
    username: "",
    displayName: "",
  };
}

function normalizeNextPath(value) {
  const nextPath = String(value || "");

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "";
  }

  return nextPath;
}

export default function AuthClient({ dictionary, locale, socialProviders = [] }) {
  const searchParams = useSearchParams();
  const { favoriteSports, sessionUser, watchlistCount } = usePreferences();
  const [mode, setMode] = useState("login");
  const [fields, setFields] = useState(buildDefaultFields());
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const nextPath = normalizeNextPath(searchParams.get("next"));
  const reason = searchParams.get("reason");
  const hasSavedContext = Boolean(watchlistCount || favoriteSports.length);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const payload =
      mode === "login"
        ? {
            identifier: fields.identifier,
            password: fields.password,
          }
        : {
            identifier: fields.identifier,
            password: fields.password,
            username: fields.username || undefined,
            displayName: fields.displayName || undefined,
          };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!response) {
      setMessage(dictionary.authSubmitFailed);
      setLoading(false);
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error || dictionary.authSubmitFailed);
      setLoading(false);
      return;
    }

    window.location.assign(
      nextPath || (hasSavedContext ? `/${locale}/favorites` : "/profile")
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={sharedStyles.eyebrow}>{dictionary.login}</p>
          <h1 className={sharedStyles.pageTitle}>{dictionary.authTitle}</h1>
          <p className={sharedStyles.pageLead}>{dictionary.authLead}</p>
        </div>

        {reason === "required" ? (
          <p className={styles.status}>{dictionary.authReasonRequired}</p>
        ) : null}
        {reason === "forbidden" ? (
          <p className={styles.status}>{dictionary.authReasonForbidden}</p>
        ) : null}

        {hasSavedContext ? (
          <p className={styles.copy}>{dictionary.authFavoritesSync}</p>
        ) : null}
      </section>

      {sessionUser ? (
        <section className={styles.panel}>
          <div>
            <p className={sharedStyles.eyebrow}>{dictionary.profile}</p>
            <h2 className={sharedStyles.sectionTitle}>{dictionary.authSignedInTitle}</h2>
            <p className={styles.copy}>{dictionary.authSignedInLead}</p>
          </div>

          <div className={styles.linkRow}>
            <Link href="/profile" className={styles.secondaryLink}>
              {dictionary.authOpenProfile}
            </Link>
            <Link href={`/${locale}/favorites`} className={styles.secondaryLink}>
              {dictionary.authOpenFavorites}
            </Link>
            <Link href={`/${locale}/settings`} className={styles.secondaryLink}>
              {dictionary.authOpenSettings}
            </Link>
          </div>
        </section>
      ) : (
        <section className={styles.panel}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={mode === "login" ? styles.tabActive : styles.tab}
              onClick={() => setMode("login")}
            >
              {dictionary.authModeLogin}
            </button>
            <button
              type="button"
              className={mode === "signup" ? styles.tabActive : styles.tab}
              onClick={() => setMode("signup")}
            >
              {dictionary.authModeSignup}
            </button>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>{dictionary.authEmail}</span>
                <input
                  type="text"
                  autoComplete="username"
                  placeholder={dictionary.authIdentifierHint}
                  value={fields.identifier}
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      identifier: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className={styles.field}>
                <span>{dictionary.authPassword}</span>
                <div className={styles.passwordField}>
                  <input
                    type={passwordVisible ? "text" : "password"}
                    value={fields.password}
                    onChange={(event) =>
                      setFields((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    aria-label={
                      passwordVisible ? dictionary.hidePassword : dictionary.showPassword
                    }
                    aria-pressed={passwordVisible}
                    onClick={() => setPasswordVisible((current) => !current)}
                  >
                    {passwordVisible ? dictionary.hidePassword : dictionary.showPassword}
                  </button>
                </div>
              </label>
            </div>

            {mode === "signup" ? (
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>{dictionary.authUsernameOptional}</span>
                  <input
                    value={fields.username}
                    onChange={(event) =>
                      setFields((current) => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className={styles.field}>
                  <span>{dictionary.authDisplayName}</span>
                  <input
                    value={fields.displayName}
                    onChange={(event) =>
                      setFields((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            ) : null}

            <div className={styles.actions}>
              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading
                  ? dictionary.authLoading
                  : mode === "login"
                    ? dictionary.authSubmitLogin
                    : dictionary.authSubmitSignup}
              </button>
              {message ? <p className={styles.message}>{message}</p> : null}
            </div>
          </form>
        </section>
      )}

      <section className={styles.panel}>
        <div>
          <p className={sharedStyles.eyebrow}>{dictionary.authSocialTitle}</p>
          <h2 className={sharedStyles.sectionTitle}>{dictionary.authSocialTitle}</h2>
          <p className={styles.copy}>
            {socialProviders.some((provider) => provider.enabled)
              ? dictionary.authSocialConfigured
              : dictionary.authSocialUnavailable}
          </p>
        </div>

        <div className={styles.providerList}>
          {socialProviders
            .filter((provider) => provider.enabled)
            .map((provider) => (
              <article key={provider.key} className={styles.providerCard}>
                <strong>{provider.label}</strong>
                <span className={styles.copy}>{provider.description}</span>
              </article>
            ))}
        </div>
      </section>
    </div>
  );
}
