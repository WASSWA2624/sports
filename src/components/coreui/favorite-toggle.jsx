"use client";

import { getDictionary } from "../../lib/coreui/dictionaries";
import { usePreferences } from "./preferences-provider";
import styles from "./styles.module.css";

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
      <span aria-hidden="true">{active ? "[*]" : "[ ]"}</span>
      {compact ? null : buttonLabel}
    </button>
  );
}
