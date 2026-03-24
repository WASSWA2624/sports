"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./profile.module.css";

function formatDate(value, locale, fallback) {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getSessionIdentifier(user) {
  return user?.loginIdentifier || user?.email || user?.phoneNumber || user?.username || "Unknown";
}

export default function ProfileClient({ dictionary, locale }) {
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [message, setMessage] = useState("");
  const [securityDraft, setSecurityDraft] = useState({
    displayName: "",
    currentPassword: "",
    nextPassword: "",
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);

    try {
      const [meRes, sessionsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/profile/sessions"),
      ]);

      if (!meRes.ok) {
        setMessage(dictionary.profileNotSignedIn);
        setSessionUser(null);
        setSessions([]);
        return;
      }

      const meJson = await meRes.json();
      setSessionUser(meJson.user);
      setSecurityDraft((current) => ({
        ...current,
        displayName: meJson.user.displayName || "",
      }));

      if (sessionsRes.ok) {
        const sessionsJson = await sessionsRes.json();
        setSessions(sessionsJson.sessions || []);
      }
    } finally {
      setLoading(false);
    }
  }, [dictionary.profileNotSignedIn]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleSecuritySave(event) {
    event.preventDefault();
    setMessage("");

    if (!securityDraft.currentPassword) {
      setMessage(dictionary.profileCurrentPasswordRequired);
      return;
    }

    const stepUpResponse = await fetch("/api/auth/step-up", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        password: securityDraft.currentPassword,
        purpose: "profile-security",
      }),
    });
    const stepUpData = await stepUpResponse.json().catch(() => ({}));

    if (!stepUpResponse.ok) {
      setMessage(stepUpData.error || dictionary.profileSecurityFailed);
      return;
    }

    const response = await fetch("/api/profile/security", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: securityDraft.displayName,
        nextPassword: securityDraft.nextPassword || undefined,
        signOutOtherSessions: true,
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error || dictionary.profileSecurityFailed);
      return;
    }

    setSessionUser(data.user || sessionUser);
    setSecurityDraft((current) => ({
      ...current,
      currentPassword: "",
      nextPassword: "",
    }));
    setMessage(data.message || dictionary.profileSecuritySaved);
    await loadProfile();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.assign(`/${locale}/auth`);
  }

  async function handleSessionRevoke(payload) {
    setMessage("");

    const response = await fetch("/api/profile/sessions", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error || dictionary.profileSessionsFailed);
      return;
    }

    if (data.signedOutCurrentSession) {
      window.location.assign(`/${locale}/auth`);
      return;
    }

    setMessage(dictionary.profileSessionsUpdated);
    await loadProfile();
  }

  if (loading) {
    return <main className={styles.statusPage}>{dictionary.profileLoading}</main>;
  }

  if (!sessionUser) {
    return <main className={styles.statusPage}>{dictionary.profileAuthRequired}</main>;
  }

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
              {dictionary.profileSignedInAs} <strong>{getSessionIdentifier(sessionUser)}</strong>
            </p>
            <p className={styles.copy}>
              {dictionary.profileRoles}: {sessionUser.roles.join(", ")}
            </p>
          </div>

          <div className={styles.quickLinks}>
            <Link href={`/${locale}/settings`} className={styles.quickLink}>
              {dictionary.settingsTitle}
            </Link>
            <Link href={`/${locale}/favorites`} className={styles.quickLink}>
              {dictionary.favorites}
            </Link>
            {sessionUser.roles.some((role) => ["EDITOR", "ADMIN"].includes(role)) ? (
              <Link href={`/${locale}/news/manage`} className={styles.quickLink}>
                {dictionary.newsManage}
              </Link>
            ) : null}
            {sessionUser.roles.includes("ADMIN") ? (
              <Link href={`/${locale}/admin`} className={styles.quickLink}>
                Admin Control Room
              </Link>
            ) : null}
          </div>
        </header>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>{dictionary.profileSecurityTitle}</h2>
              <p className={styles.copy}>{dictionary.profileSecurityLead}</p>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSecuritySave}>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>{dictionary.authDisplayName}</span>
                <input
                  value={securityDraft.displayName}
                  onChange={(event) =>
                    setSecurityDraft((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>{dictionary.profileCurrentPassword}</span>
                <input
                  type="password"
                  value={securityDraft.currentPassword}
                  onChange={(event) =>
                    setSecurityDraft((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className={styles.grid}>
              <label className={styles.field}>
                <span>{dictionary.profileNewPassword}</span>
                <input
                  type="password"
                  value={securityDraft.nextPassword}
                  onChange={(event) =>
                    setSecurityDraft((current) => ({
                      ...current,
                      nextPassword: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.saveButton}>
                {dictionary.profileSecuritySave}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={handleLogout}>
                {dictionary.profileLogout}
              </button>
            </div>
          </form>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>{dictionary.profileSessionsTitle}</h2>
              <p className={styles.copy}>{dictionary.profileSessionsLead}</p>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => handleSessionRevoke({ scope: "others" })}
              >
                {dictionary.profileSessionsSignOutOthers}
              </button>
            </div>
          </div>

          <div className={styles.sessionList}>
            {sessions.map((session) => (
              <article key={session.id} className={styles.sessionCard}>
                <div className={styles.sessionMeta}>
                  <strong>
                    {session.isCurrent
                      ? dictionary.profileSessionsCurrent
                      : dictionary.profileSessionsDevice}
                  </strong>
                  <span>{session.userAgent || dictionary.profileSessionsUnknownAgent}</span>
                  <span>
                    {dictionary.profileSessionsLastSeen}:{" "}
                    {formatDate(session.lastSeenAt, locale, dictionary.profileSessionsNever)}
                  </span>
                  <span>
                    {dictionary.profileSessionsCreated}:{" "}
                    {formatDate(session.createdAt, locale, dictionary.profileSessionsNever)}
                  </span>
                </div>
                <div className={styles.sessionActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() =>
                      handleSessionRevoke(
                        session.isCurrent
                          ? { scope: "current" }
                          : { sessionId: session.id, scope: "current" }
                      )
                    }
                  >
                    {session.isCurrent
                      ? dictionary.profileSessionsSignOutCurrent
                      : dictionary.profileSessionsSignOutDevice}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {message ? <p className={styles.message}>{message}</p> : null}
      </section>
    </main>
  );
}
