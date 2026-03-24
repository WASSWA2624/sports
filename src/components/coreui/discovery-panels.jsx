"use client";

import Link from "next/link";
import { AlertSubscriptionControl } from "./alert-subscription-control";
import { FavoriteToggle } from "./favorite-toggle";
import sharedStyles from "./styles.module.css";
import styles from "./search-experience.module.css";
import { buildCompetitionHref } from "../../lib/coreui/routes";
import { TrackedActionLink } from "./tracked-action-link";
import { usePreferences } from "./preferences-provider";

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

            <div className={sharedStyles.fixtureActionRow}>
              <FavoriteToggle
                itemId={`competition:${competition.code}`}
                locale={locale}
                compact
                label={competition.name}
                metadata={{
                  country: competition.country || null,
                }}
                surface="top-competitions"
              />
              <AlertSubscriptionControl
                itemId={`competition:${competition.code}`}
                locale={locale}
                supportedTypes={["KICKOFF", "FINAL_RESULT", "NEWS"]}
                compact
                label={competition.name}
                metadata={{
                  country: competition.country || null,
                }}
                surface="top-competitions"
              />
              <Link href={buildCompetitionHref(locale, competition)} className={sharedStyles.sectionAction}>
                {dictionary.overview}
              </Link>
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
  const { compliance, promptPreferences, setPromptPreference } = usePreferences();

  if (!items.length) {
    return null;
  }

  if (!compliance.promptOptInAllowed) {
    return null;
  }

  return (
    <section className={sharedStyles.section}>
      <div className={sharedStyles.sectionHeader}>
        <div>
          <p className={sharedStyles.eyebrow}>{dictionary.profileAlerts}</p>
          <h2 className={sharedStyles.sectionTitle}>{dictionary.reminderTitle}</h2>
          <p className={sharedStyles.sectionLead}>
            {promptPreferences.reminderPrompts
              ? dictionary.reminderLead
              : dictionary.reminderOptInLead}
          </p>
        </div>
      </div>

      {promptPreferences.reminderPrompts ? (
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
      ) : (
        <article className={styles.discoveryPanel}>
          <div className={sharedStyles.section}>
            <p className={sharedStyles.muted}>{dictionary.reminderOptInBody}</p>
            <div className={sharedStyles.inlineBadgeRow}>
              <button
                type="button"
                className={sharedStyles.sectionAction}
                onClick={() => setPromptPreference("reminderPrompts", true)}
              >
                {dictionary.enableReminderPrompts}
              </button>
              <Link href={`/${locale}/settings`} className={sharedStyles.sectionAction}>
                {dictionary.settingsTitle}
              </Link>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}

export function FavoriteChannelPanel({
  locale,
  dictionary,
  items = [],
  actions = [],
  surface = "favorite-channels",
  geoLabel = null,
}) {
  const { compliance, promptPreferences, setPromptPreference } = usePreferences();

  if (!items.length || !actions.length) {
    return null;
  }

  if (!compliance.promptOptInAllowed) {
    return null;
  }

  return (
    <section className={sharedStyles.section}>
      <div className={sharedStyles.sectionHeader}>
        <div>
          <p className={sharedStyles.eyebrow}>{dictionary.favorites}</p>
          <h2 className={sharedStyles.sectionTitle}>{dictionary.favoriteChannelsTitle}</h2>
          <p className={sharedStyles.sectionLead}>
            {promptPreferences.funnelPrompts
              ? dictionary.favoriteChannelsLead
              : dictionary.favoriteChannelsOptInLead}
          </p>
        </div>
        {geoLabel ? <span className={sharedStyles.badge}>{geoLabel}</span> : null}
      </div>

      {promptPreferences.funnelPrompts ? (
        <article className={styles.discoveryPanel}>
          <div className={sharedStyles.inlineBadgeRow}>
            {items.map((item) => (
              <Link key={item.itemId} href={item.href} className={sharedStyles.badge}>
                {item.title}
              </Link>
            ))}
          </div>

          <div className={sharedStyles.fixtureActionRow}>
            {actions.map((action) => (
              <TrackedActionLink
                key={action.key}
                href={action.href}
                external
                className={sharedStyles.actionLink}
                analyticsEvent="funnel_cta_click"
                analyticsSurface={surface}
                analyticsEntityType="favorite_channel"
                analyticsEntityId={action.key}
                analyticsAction={`favorite-channel:${action.key}`}
                analyticsMetadata={{
                  itemIds: items.map((item) => item.itemId),
                }}
              >
                {action.label}
              </TrackedActionLink>
            ))}
          </div>
        </article>
      ) : (
        <article className={styles.discoveryPanel}>
          <p className={sharedStyles.muted}>{dictionary.favoriteChannelsOptInBody}</p>
          <div className={sharedStyles.fixtureActionRow}>
            <button
              type="button"
              className={sharedStyles.sectionAction}
              onClick={() => setPromptPreference("funnelPrompts", true)}
            >
              {dictionary.enableFunnelPrompts}
            </button>
            <Link href={`/${locale}/settings`} className={sharedStyles.sectionAction}>
              {dictionary.settingsTitle}
            </Link>
          </div>
        </article>
      )}
    </section>
  );
}
