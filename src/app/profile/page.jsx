"use client";

import { useEffect, useState } from "react";

const defaultPreferences = {
  locale: "en",
  theme: "system",
};

export default function ProfilePage() {
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
          setMessage("You are not signed in.");
          return;
        }

        const meJson = await meRes.json();
        setSessionUser(meJson.user);

        if (prefsRes.ok) {
          const prefsJson = await prefsRes.json();
          setPreferences({
            locale: prefsJson.locale ?? "en",
            theme: prefsJson.theme ?? "system",
          });
        }
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

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
      setMessage(data.error || "Failed to save preferences.");
      return;
    }
    setMessage("Preferences saved.");
  }

  if (loading) {
    return <main style={{ padding: 24 }}>Loading profile...</main>;
  }

  if (!sessionUser) {
    return <main style={{ padding: 24 }}>Authentication required.</main>;
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
      <h1>Profile</h1>
      <p>
        Signed in as <strong>{sessionUser.email}</strong>
      </p>
      <p>Roles: {sessionUser.roles.join(", ")}</p>

      <form onSubmit={handleSavePreferences} style={{ marginTop: 24 }}>
        <label htmlFor="locale">Locale</label>
        <input
          id="locale"
          value={preferences.locale}
          onChange={(event) =>
            setPreferences((prev) => ({ ...prev, locale: event.target.value }))
          }
          style={{ display: "block", marginTop: 8, marginBottom: 16, width: "100%" }}
        />

        <label htmlFor="theme">Theme</label>
        <select
          id="theme"
          value={preferences.theme}
          onChange={(event) =>
            setPreferences((prev) => ({ ...prev, theme: event.target.value }))
          }
          style={{ display: "block", marginTop: 8, marginBottom: 16, width: "100%" }}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>

        <button type="submit">Save preferences</button>
      </form>

      {message && <p style={{ marginTop: 16 }}>{message}</p>}
    </main>
  );
}
