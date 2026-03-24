"use client";

import { ALERT_NOTIFICATION_TYPES } from "../../lib/alerts";
import { formatDictionaryText, getDictionary } from "../../lib/coreui/dictionaries";
import { usePreferences } from "./preferences-provider";
import styles from "./styles.module.css";

function BellIcon({ active }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={styles.controlIcon}
      fill={active ? "currentColor" : "none"}
    >
      <path
        d="M12 5.25a4 4 0 0 1 4 4v1.34c0 .93.31 1.84.89 2.58l1.11 1.41H6l1.11-1.41A4.12 4.12 0 0 0 8 10.59V9.25a4 4 0 0 1 4-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.25 17.25a1.75 1.75 0 0 0 3.5 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getAlertLabel(type, dictionary) {
  if (type === "KICKOFF") {
    return dictionary.profileAlertKickoff;
  }

  if (type === "GOAL") {
    return dictionary.profileAlertGoals;
  }

  if (type === "CARD") {
    return dictionary.profileAlertCards;
  }

  if (type === "PERIOD_CHANGE") {
    return dictionary.profileAlertPeriodChange;
  }

  if (type === "NEWS") {
    return dictionary.profileAlertNews;
  }

  return dictionary.profileAlertFinalResult;
}

export function AlertSubscriptionControl({
  itemId,
  locale,
  supportedTypes = ALERT_NOTIFICATION_TYPES,
  compact = false,
  label,
  metadata,
  surface = "app",
}) {
  const dictionary = getDictionary(locale);
  const { getAlertTypes, toggleAlertType, sessionUser } = usePreferences();
  const activeTypes = getAlertTypes(itemId);
  const supported = supportedTypes.filter(Boolean);
  const activeCount = supported.filter((type) => activeTypes.includes(type)).length;
  const buttonClass = activeCount ? styles.alertButtonActive : styles.alertButton;

  return (
    <details className={styles.alertControl}>
      <summary className={buttonClass}>
        <BellIcon active={activeCount > 0} />
        {compact ? (
          <span className={styles.alertButtonCount}>{activeCount}</span>
        ) : activeCount ? (
          formatDictionaryText(dictionary.alertsManageCount, { count: activeCount })
        ) : (
          dictionary.alertsManage
        )}
      </summary>

      <div className={styles.alertPanel}>
        <div className={styles.cardHeader}>
          <div>
            <strong>{dictionary.alertsManage}</strong>
            <p className={styles.muted}>
              {sessionUser ? dictionary.alertsSyncAccount : dictionary.alertsSyncGuest}
            </p>
          </div>
          <span className={styles.badge}>{activeCount}</span>
        </div>

        {supported.length ? (
          <div className={styles.alertOptionList}>
            {supported.map((type) => {
              const checked = activeTypes.includes(type);

              return (
                <label key={type} className={styles.alertOption}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      toggleAlertType(itemId, type, event.target.checked, {
                        label,
                        metadata,
                        surface,
                      })
                    }
                  />
                  <span>{getAlertLabel(type, dictionary)}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>{dictionary.alertsUnavailable}</div>
        )}
      </div>
    </details>
  );
}
