import styles from "./route-feedback.module.css";

function SkeletonCard() {
  return (
    <article className={styles.fixtureCard}>
      <div className={styles.skeletonBlockTall} />
      <div className={styles.skeletonRow}>
        <div className={styles.skeletonPill} />
        <div className={styles.skeletonPillShort} />
      </div>
      <div className={styles.skeletonBlock} />
      <div className={styles.skeletonBlock} />
    </article>
  );
}

export function RouteSkeleton({ cards = 6, showFilters = true }) {
  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <div className={styles.skeletonHeaderStack}>
          <div className={styles.skeletonPillShort} />
          <div className={styles.skeletonTitle} />
        </div>
        <div className={styles.skeletonPill} />
      </header>

      {showFilters ? (
        <>
          <div className={styles.filterRow}>
            <div className={styles.skeletonPillWide} />
            <div className={styles.skeletonPill} />
            <div className={styles.skeletonPill} />
            <div className={styles.skeletonPillShort} />
          </div>
          <div className={styles.filterRow}>
            <div className={styles.skeletonPillWide} />
            <div className={styles.skeletonPill} />
            <div className={styles.skeletonPillShort} />
          </div>
        </>
      ) : null}

      <div className={styles.fixtureGrid}>
        {Array.from({ length: cards }, (_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </section>
  );
}
