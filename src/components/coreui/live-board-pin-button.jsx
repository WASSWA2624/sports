"use client";

import { usePreferences } from "./preferences-provider";
import boardStyles from "./live-board.module.css";

export function LiveBoardPinButton({
  itemId,
  activeLabel,
  inactiveLabel,
  label,
  metadata,
  surface = "live-board",
}) {
  const { isWatched, toggleWatch } = usePreferences();
  const active = isWatched(itemId);

  return (
    <button
      type="button"
      aria-pressed={active}
      className={active ? boardStyles.pinButtonActive : boardStyles.pinButton}
      onClick={() => toggleWatch(itemId, { label, metadata, surface })}
    >
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}
