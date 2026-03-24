import { ModuleEngagementTracker } from "./module-engagement-tracker";
import { TrackedActionLink } from "./tracked-action-link";
import sharedStyles from "./styles.module.css";
import styles from "./news-promo-unit.module.css";

function hasRenderableContent(promo) {
  return Boolean(
    promo?.primaryAction?.href ||
      promo?.secondaryActions?.some((entry) => entry?.href) ||
      promo?.quickLinks?.some((entry) => entry?.href) ||
      promo?.bookmakers?.length ||
      promo?.sponsorship
  );
}

export function NewsPromoUnit({
  dictionary,
  promo,
  surface,
  variant = "full",
  moduleType = "news_promo_unit",
}) {
  if (!promo || !hasRenderableContent(promo)) {
    return null;
  }

  const cardClassName =
    variant === "compact"
      ? `${sharedStyles.panel} ${styles.card} ${styles.compact}`
      : `${sharedStyles.panel} ${styles.card} ${styles.full}`;

  return (
    <ModuleEngagementTracker
      moduleType={moduleType}
      entityType={promo.entityType || "news"}
      entityId={promo.entityId || null}
      surface={surface}
      metadata={{ geo: promo.geoLabel || null, variant }}
    >
      <article className={cardClassName}>
        <div className={sharedStyles.sectionHeader}>
          <div className={styles.copy}>
            <div className={styles.metaRow}>
              <span className={sharedStyles.badge}>{dictionary.news}</span>
              {promo.geoLabel ? (
                <span className={styles.marketChip}>
                  {dictionary.currentMarket}: {promo.geoLabel}
                </span>
              ) : null}
              {promo.sponsorship ? (
                <span className={`${styles.marketChip} ${styles.sponsorChip}`}>
                  {promo.sponsorship.name
                    ? `${promo.sponsorship.label}: ${promo.sponsorship.name}`
                    : promo.sponsorship.label}
                </span>
              ) : null}
            </div>
            <h3 className={`${sharedStyles.cardTitle} ${styles.title}`}>{promo.title}</h3>
            {promo.lead ? <p className={`${sharedStyles.sectionLead} ${styles.lead}`}>{promo.lead}</p> : null}
          </div>
        </div>

        {promo.bookmakers?.length ? (
          <div className={styles.bookmakerRow}>
            {promo.bookmakers.map((entry) => (
              <span key={entry} className={sharedStyles.badge}>
                {entry}
              </span>
            ))}
          </div>
        ) : null}

        {promo.quickLinks?.length ? (
          <div className={variant === "compact" ? styles.quickRow : styles.quickGrid}>
            {promo.quickLinks.map((entry) => (
              <TrackedActionLink
                key={entry.key}
                href={entry.href}
                external={entry.external}
                className={sharedStyles.sectionAction}
                analyticsEvent={entry.analyticsEvent}
                analyticsSurface={surface}
                analyticsEntityType={promo.entityType || "news"}
                analyticsEntityId={promo.entityId || undefined}
                analyticsAction={entry.analyticsAction}
                affiliateClick={entry.affiliateClick}
              >
                {entry.label}
              </TrackedActionLink>
            ))}
          </div>
        ) : null}

        {promo.primaryAction?.href || promo.secondaryActions?.some((entry) => entry?.href) ? (
          <div className={styles.actionRow}>
            {promo.primaryAction?.href ? (
              <TrackedActionLink
                href={promo.primaryAction.href}
                external={promo.primaryAction.external}
                className={sharedStyles.actionLink}
                analyticsEvent={promo.primaryAction.analyticsEvent}
                analyticsSurface={surface}
                analyticsEntityType={promo.entityType || "news"}
                analyticsEntityId={promo.entityId || undefined}
                analyticsAction={promo.primaryAction.analyticsAction}
                affiliateClick={promo.primaryAction.affiliateClick}
              >
                {promo.primaryAction.label}
              </TrackedActionLink>
            ) : null}

            {(promo.secondaryActions || [])
              .filter((entry) => entry?.href)
              .map((entry) => (
                <TrackedActionLink
                  key={entry.key}
                  href={entry.href}
                  external={entry.external}
                  className={sharedStyles.sectionAction}
                  analyticsEvent={entry.analyticsEvent}
                  analyticsSurface={surface}
                  analyticsEntityType={promo.entityType || "news"}
                  analyticsEntityId={promo.entityId || undefined}
                  analyticsAction={entry.analyticsAction}
                  affiliateClick={entry.affiliateClick}
                >
                  {entry.label}
                </TrackedActionLink>
              ))}
          </div>
        ) : null}
      </article>
    </ModuleEngagementTracker>
  );
}
