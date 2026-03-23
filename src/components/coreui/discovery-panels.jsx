import Link from "next/link";
import { AlertSubscriptionControl } from "./alert-subscription-control";
import sharedStyles from "./styles.module.css";
import styles from "./search-experience.module.css";
import { buildCompetitionHref } from "../../lib/coreui/routes";

export function TopCompetitionsPanel({ locale, dictionary, competitions = [] }) {
  if (!competitions.length) {
    return null;
  }

  return (
    <section className={sharedStyles.section}>
      <div className={sharedStyles.sectionHeader}>
        <div>
          <p className={sharedStyles.eyebrow}>{dictionary.search}</p>
          <h2 className={sharedStyles.sectionTitle}>{dictionary.topCompetitionsTitle}</h2>
          <p className={sharedStyles.sectionLead}>{dictionary.topCompetitionsLead}</p>
        </div>
      </div>

      <div className={styles.discoveryGrid}>
        {competitions.map((competition) => (
          <article key={competition.code} className={styles.discoveryPanel}>
            <div className={sharedStyles.cardHeader}>
              <div>
                <h3 className={sharedStyles.cardTitle}>
                  <Link href={buildCompetitionHref(locale, competition)}>{competition.name}</Link>
                </h3>
                <p className={sharedStyles.muted}>{competition.country || dictionary.international}</p>
              </div>
              <span className={sharedStyles.badge}>{competition.teamCount}</span>
            </div>

            <div className={sharedStyles.inlineBadgeRow}>
              {competition.currentSeason ? (
                <span className={sharedStyles.badge}>{competition.currentSeason}</span>
              ) : null}
              <span className={sharedStyles.badge}>{dictionary.live}: {competition.liveCount}</span>
              <span className={sharedStyles.badge}>{dictionary.fixtures}: {competition.scheduledCount}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function RecentItemsPanel({ dictionary, items = [] }) {
  if (!items.length) {
    return null;
  }

  return (
    <section className={sharedStyles.section}>
      <div className={sharedStyles.sectionHeader}>
        <div>
          <p className={sharedStyles.eyebrow}>{dictionary.recent}</p>
          <h2 className={sharedStyles.sectionTitle}>{dictionary.recentItemsTitle}</h2>
          <p className={sharedStyles.sectionLead}>{dictionary.recentItemsLead}</p>
        </div>
        <span className={sharedStyles.badge}>{items.length}</span>
      </div>

      <div className={styles.discoveryGrid}>
        {items.map((item) => (
          <article key={item.key} className={styles.discoveryPanel}>
            <Link href={item.href} className={styles.discoveryLink}>
              <div className={styles.discoveryLabel}>
                <strong>{item.title}</strong>
                <span className={styles.discoveryMeta}>{item.subtitle}</span>
              </div>
              <span className={sharedStyles.badge}>{item.type}</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function FavoriteReminderPanel({ locale, dictionary, items = [] }) {
  if (!items.length) {
    return null;
  }

  return (
    <section className={sharedStyles.section}>
      <div className={sharedStyles.sectionHeader}>
        <div>
          <p className={sharedStyles.eyebrow}>{dictionary.profileAlerts}</p>
          <h2 className={sharedStyles.sectionTitle}>{dictionary.reminderTitle}</h2>
          <p className={sharedStyles.sectionLead}>{dictionary.reminderLead}</p>
        </div>
      </div>

      <div className={styles.discoveryGrid}>
        {items.map((item) => (
          <article key={item.itemId} className={styles.discoveryPanel}>
            <div className={sharedStyles.cardHeader}>
              <div>
                <h3 className={sharedStyles.cardTitle}>
                  <Link href={item.href}>{item.title}</Link>
                </h3>
                {item.subtitle ? <p className={sharedStyles.muted}>{item.subtitle}</p> : null}
              </div>
            </div>

            <AlertSubscriptionControl
              itemId={item.itemId}
              locale={locale}
              supportedTypes={item.supportedTypes}
              label={item.title}
              surface={item.surface || "favorites-reminder"}
            />
          </article>
        ))}
      </div>
    </section>
  );
}
