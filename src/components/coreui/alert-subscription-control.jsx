"use client";

import { ALERT_NOTIFICATION_TYPES } from "../../lib/alerts";
import { formatDictionaryText, getDictionary } from "../../lib/coreui/dictionaries";
import { usePreferences } from "./preferences-provider";
import styles from "./styles.module.css";

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
        <span aria-hidden="true">{activeCount ? "[!]" : "[ ]"}</span>
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
