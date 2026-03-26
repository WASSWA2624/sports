"use client";

import styles from "./route-feedback.module.css";

export function RouteError({ title, body, eyebrow, resetLabel, reset }) {
  return (
    <section className={styles.section}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.pageTitle}>{title}</h1>
        </div>
      </div>

      <div className={styles.emptyState}>
        <p>{body}</p>
        <button type="button" className={styles.actionButton} onClick={() => reset()}>
          {resetLabel}
        </button>
      </div>
    </section>
  );
}
