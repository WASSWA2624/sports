"use client";

import { getDictionary } from "../../lib/coreui/dictionaries";
import { usePreferences } from "./preferences-provider";
import styles from "./styles.module.css";

function BookmarkIcon({ active }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={styles.controlIcon}
      fill={active ? "currentColor" : "none"}
    >
      <path
        d="M7 4.75h10a1 1 0 0 1 1 1v13.5l-6-3-6 3V5.75a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FavoriteToggle({
  itemId,
  locale,
  compact = false,
  label,
  metadata,
  surface = "app",
}) {
  const dictionary = getDictionary(locale);
  const { isWatched, toggleWatch } = usePreferences();
  const active = isWatched(itemId);
  const buttonLabel = active ? dictionary.watching : dictionary.watch;

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={buttonLabel}
      className={
        compact
          ? active
            ? styles.favoriteButtonCompactActive
            : styles.favoriteButtonCompact
          : active
            ? styles.favoriteButtonActive
            : styles.favoriteButton
      }
      onClick={() => toggleWatch(itemId, { label, metadata, surface })}
    >
      <BookmarkIcon active={active} />
      {compact ? null : buttonLabel}
    </button>
  );
}
