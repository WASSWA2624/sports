"use client";

import { startTransition, useEffect, useState } from "react";
import styles from "./styles.module.css";

export function RegulatedContentGate({
  storageKey,
  title,
  body,
  confirmLabel,
  legalLines = [],
  children,
}) {
  const [isReady, setIsReady] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  useEffect(() => {
    try {
      setIsAcknowledged(window.localStorage.getItem(storageKey) === "true");
    } catch (error) {
      setIsAcknowledged(false);
    } finally {
      setIsReady(true);
    }
  }, [storageKey]);

  if (!isReady) {
    return null;
  }

  if (isAcknowledged) {
    return children;
  }

  return (
    <article className={styles.regulatedGate}>
      <div className={styles.regulatedGateBody}>
        <div>
          <p className={styles.eyebrow}>{title}</p>
          <h3 className={styles.cardTitle}>{title}</h3>
          <p className={styles.sectionLead}>{body}</p>
        </div>

        {legalLines.length ? (
          <div className={styles.legalStack}>
            {legalLines.map((line) => (
              <span key={line} className={styles.legalChip}>
                {line}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.regulatedGateActions}>
        <button
          type="button"
          className={styles.actionLink}
          data-analytics-action="age-confirm"
          onClick={() => {
            try {
              window.localStorage.setItem(storageKey, "true");
            } catch (error) {
              // Ignore storage failures and still unlock the local view.
            }

            startTransition(() => {
              setIsAcknowledged(true);
            });
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </article>
  );
}
