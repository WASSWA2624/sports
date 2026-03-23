"use client";

import { getDictionary } from "../../lib/coreui/dictionaries";
import { usePreferences } from "./preferences-provider";
import styles from "./styles.module.css";

export function FavoriteToggle({ itemId, locale }) {
  const dictionary = getDictionary(locale);
  const { isWatched, toggleWatch } = usePreferences();
  const active = isWatched(itemId);

  return (
    <button
      type="button"
      aria-pressed={active}
      className={active ? styles.favoriteButtonActive : styles.favoriteButton}
      onClick={() => toggleWatch(itemId)}
    >
      <span aria-hidden="true">{active ? "[*]" : "[ ]"}</span>
      {active ? dictionary.watching : dictionary.watch}
    </button>
  );
}
