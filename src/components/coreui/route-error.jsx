"use client";

import styles from "./styles.module.css";

export function RouteError({ title, body, resetLabel = "Retry", reset }) {
  return (
    <section className={styles.section}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Route error</p>
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
