import Link from "next/link";
import styles from "./styles.module.css";

function ActionLink({ href, label }) {
  if (!href || !label) {
    return null;
  }

  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={styles.sectionAction}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={styles.sectionAction}>
      {label}
    </Link>
  );
}

export function PlatformFoundationPage({ eyebrow, title, lead, sections = [] }) {
  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.pageTitle}>{title}</h1>
          <p className={styles.pageLead}>{lead}</p>
        </div>
      </header>

      <div className={styles.compactList}>
        {sections.map((section) => (
          <article key={section.title} className={styles.miniPanel}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
              {section.badge ? <span className={styles.badge}>{section.badge}</span> : null}
            </div>
            <p className={styles.railMuted}>{section.body}</p>

            {section.pills?.length ? (
              <div className={styles.inlineBadgeRow}>
                {section.pills.map((pill) => (
                  <span key={pill} className={styles.badge}>
                    {pill}
                  </span>
                ))}
              </div>
            ) : null}

            <ActionLink href={section.href} label={section.actionLabel} />
          </article>
        ))}
      </div>
    </section>
  );
}
