"use client";

import { buildMatchHref } from "../../lib/coreui/routes";
import { ModuleEngagementTracker } from "./module-engagement-tracker";
import { TrackedActionLink } from "./tracked-action-link";
import styles from "./styles.module.css";

function InsightCard({ moduleType, surface, entityType, entityId, geo, title, lead, children }) {
  return (
    <ModuleEngagementTracker
      moduleType={moduleType}
      entityType={entityType}
      entityId={entityId}
      surface={surface}
      metadata={{ geo }}
    >
      <article className={styles.insightCard}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>{title}</h3>
            {lead ? <p className={styles.sectionLead}>{lead}</p> : null}
          </div>
        </div>
        {children}
      </article>
    </ModuleEngagementTracker>
  );
}

function PredictionItem({
  locale,
  surface,
  pageEntityType,
  pageEntityId,
  entry,
  dictionary,
  affiliateActionLabel,
}) {
  const matchHref = entry.fixtureRef ? buildMatchHref(locale, { externalRef: entry.fixtureRef }) : null;

  return (
    <article key={entry.key} className={styles.insightItem}>
      <div className={styles.insightMeta}>
        {entry.confidenceLabel ? (
          <span className={styles.insightMetric}>
            {dictionary.predictionConfidence}: {entry.confidenceLabel}
          </span>
        ) : null}
        {entry.edgeScore != null ? (
          <span className={styles.insightMetric}>
            {dictionary.predictionEdge}: {entry.edgeScore.toFixed(1)}
          </span>
        ) : null}
        {entry.bookmaker ? <span className={styles.badge}>{entry.bookmaker}</span> : null}
      </div>

      <div>
        <h4 className={styles.cardTitle}>{entry.title}</h4>
        {entry.fixtureLabel ? <p className={styles.sectionLead}>{entry.fixtureLabel}</p> : null}
        {entry.selectionLabel ? <p className={styles.muted}>{entry.selectionLabel}</p> : null}
        {entry.reasoning ? (
          <p className={styles.fixtureSummary}>
            {dictionary.predictionReasoning}: {entry.reasoning}
          </p>
        ) : null}
      </div>

      <div className={styles.insightSplit}>
        {entry.marketType ? <span className={styles.badge}>{entry.marketType}</span> : null}
        {entry.priceLabel ? <strong className={styles.insightPrice}>{entry.priceLabel}</strong> : null}
      </div>

      <div className={styles.insightActions}>
        {matchHref ? (
          <TrackedActionLink
            href={matchHref}
            className={styles.sectionAction}
            analyticsEvent="odds_cta_click"
            analyticsSurface={surface}
            analyticsEntityType={pageEntityType}
            analyticsEntityId={pageEntityId}
            analyticsAction="open-match-centre"
            analyticsMetadata={{
              targetFixtureId: entry.fixtureId || null,
            }}
          >
            {dictionary.liveBoardOpenCenter}
          </TrackedActionLink>
        ) : null}

        {entry.cta?.href ? (
          <TrackedActionLink
            href={entry.cta.href}
            external={entry.cta.external}
            className={styles.actionLink}
            analyticsEvent="prediction_cta_click"
            analyticsSurface={surface}
            analyticsEntityType={pageEntityType}
            analyticsEntityId={pageEntityId}
            analyticsAction="prediction-affiliate"
            analyticsMetadata={{
              targetFixtureId: entry.fixtureId || null,
              bookmaker: entry.bookmaker || null,
            }}
            affiliateClick={entry.cta}
          >
            {affiliateActionLabel}
          </TrackedActionLink>
        ) : null}
      </div>
    </article>
  );
}

function OddsItem({
  locale,
  surface,
  pageEntityType,
  pageEntityId,
  entry,
  dictionary,
  affiliateActionLabel,
}) {
  const matchHref = entry.fixtureRef ? buildMatchHref(locale, { externalRef: entry.fixtureRef }) : null;

  return (
    <article key={entry.key} className={styles.insightItem}>
      <div className={styles.insightMeta}>
        {entry.bookmaker ? <span className={styles.badge}>{entry.bookmaker}</span> : null}
        {entry.marketType ? <span className={styles.badge}>{entry.marketType}</span> : null}
      </div>

      <div>
        <h4 className={styles.cardTitle}>{entry.fixtureLabel}</h4>
        {entry.selectionLabel ? <p className={styles.sectionLead}>{entry.selectionLabel}</p> : null}
        {entry.competitionName ? <p className={styles.muted}>{entry.competitionName}</p> : null}
      </div>

      <div className={styles.insightSplit}>
        <span className={styles.insightMetric}>{dictionary.bestPrice}</span>
        {entry.priceLabel ? <strong className={styles.insightPrice}>{entry.priceLabel}</strong> : null}
      </div>

      <div className={styles.insightActions}>
        {matchHref ? (
          <TrackedActionLink
            href={matchHref}
            className={styles.sectionAction}
            analyticsEvent="odds_cta_click"
            analyticsSurface={surface}
            analyticsEntityType={pageEntityType}
            analyticsEntityId={pageEntityId}
            analyticsAction="open-match-centre"
            analyticsMetadata={{
              targetFixtureId: entry.fixtureId || null,
            }}
          >
            {dictionary.liveBoardOpenCenter}
          </TrackedActionLink>
        ) : null}

        {entry.cta?.href ? (
          <TrackedActionLink
            href={entry.cta.href}
            external={entry.cta.external}
            className={styles.actionLink}
            analyticsEvent="odds_cta_click"
            analyticsSurface={surface}
            analyticsEntityType={pageEntityType}
            analyticsEntityId={pageEntityId}
            analyticsAction="odds-affiliate"
            analyticsMetadata={{
              targetFixtureId: entry.fixtureId || null,
              bookmaker: entry.bookmaker || null,
            }}
            affiliateClick={entry.cta}
          >
            {affiliateActionLabel}
          </TrackedActionLink>
        ) : null}
      </div>
    </article>
  );
}

export function OddsPredictionWidgets({
  locale,
  dictionary,
  surface,
  entityType,
  entityId,
  insights,
  ctaConfig,
  broadcastQuickActions = null,
  showBestBet = true,
}) {
  if (!insights && !ctaConfig && !broadcastQuickActions) {
    return null;
  }

  const bestBet = showBestBet ? insights?.bestBet : null;
  const affiliateActionLabel = dictionary.betNow;
  const primaryLead =
    surface === "match-detail" ? dictionary.matchInsightsLead : dictionary.competitionInsightsLead;
  const hasContent =
    bestBet ||
    broadcastQuickActions?.primary ||
    broadcastQuickActions?.message ||
    insights?.topPicks?.length ||
    insights?.valueBets?.length ||
    insights?.bestOdds?.length ||
    insights?.highOddsMatches?.length ||
    ctaConfig?.primaryAffiliate?.href ||
    ctaConfig?.funnelActions?.length;

  if (!hasContent) {
    return null;
  }

  return (
    <div className={styles.insightGrid}>
      {bestBet ? (
        <ModuleEngagementTracker
          moduleType="best_bet_highlight"
          entityType={entityType}
          entityId={entityId}
          surface={surface}
          metadata={{ geo: ctaConfig?.geo || null }}
        >
          <article className={styles.insightHero}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.eyebrow}>{dictionary.bestBet}</p>
                <h3 className={styles.cardTitle}>{bestBet.title}</h3>
                {bestBet.fixtureLabel ? <p className={styles.sectionLead}>{bestBet.fixtureLabel}</p> : null}
              </div>
              {bestBet.bookmaker ? <span className={styles.badge}>{bestBet.bookmaker}</span> : null}
            </div>

            <div className={styles.insightSplit}>
              {bestBet.selectionLabel ? <span className={styles.badge}>{bestBet.selectionLabel}</span> : null}
              {bestBet.priceLabel ? <strong className={styles.insightPrice}>{bestBet.priceLabel}</strong> : null}
            </div>

            {bestBet.reasoning ? (
              <p className={styles.fixtureSummary}>
                {dictionary.predictionReasoning}: {bestBet.reasoning}
              </p>
            ) : null}

            <div className={styles.insightActions}>
              {bestBet.fixtureRef ? (
                <TrackedActionLink
                  href={buildMatchHref(locale, { externalRef: bestBet.fixtureRef })}
                  className={styles.sectionAction}
                  analyticsEvent="odds_cta_click"
                  analyticsSurface={surface}
                  analyticsEntityType={entityType}
                  analyticsEntityId={entityId}
                  analyticsAction="best-bet-match-centre"
                >
                  {dictionary.liveBoardOpenCenter}
                </TrackedActionLink>
              ) : null}

              {bestBet.cta?.href ? (
                <TrackedActionLink
                  href={bestBet.cta.href}
                  external={bestBet.cta.external}
                  className={styles.actionLink}
                  analyticsEvent="prediction_cta_click"
                  analyticsSurface={surface}
                  analyticsEntityType={entityType}
                  analyticsEntityId={entityId}
                  analyticsAction="best-bet-affiliate"
                  analyticsMetadata={{
                    targetFixtureId: bestBet.fixtureId || null,
                    bookmaker: bestBet.bookmaker || null,
                  }}
                  affiliateClick={bestBet.cta}
                >
                  {affiliateActionLabel}
                </TrackedActionLink>
              ) : null}
            </div>
          </article>
        </ModuleEngagementTracker>
      ) : null}

      {broadcastQuickActions ? (
        <ModuleEngagementTracker
          moduleType="broadcast_quick_actions"
          entityType={entityType}
          entityId={entityId}
          surface={surface}
          metadata={{ geo: ctaConfig?.geo || null }}
        >
          <article className={styles.insightCard}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.eyebrow}>{dictionary.broadcastGuide}</p>
                <h3 className={styles.cardTitle}>{dictionary.watchOptions}</h3>
                <p className={styles.sectionLead}>{dictionary.broadcastLead}</p>
              </div>
              {broadcastQuickActions.primary?.channelTypeLabel ? (
                <span className={styles.badge}>{broadcastQuickActions.primary.channelTypeLabel}</span>
              ) : null}
            </div>

            {broadcastQuickActions.primary ? (
              <div className={styles.insightItem}>
                <div>
                  <h4 className={styles.cardTitle}>{broadcastQuickActions.primary.name}</h4>
                  {broadcastQuickActions.primary.territory ? (
                    <p className={styles.sectionLead}>{broadcastQuickActions.primary.territory}</p>
                  ) : null}
                </div>
                <div className={styles.insightActions}>
                  <TrackedActionLink
                    href={broadcastQuickActions.primary.href}
                    external
                    className={styles.actionLink}
                    analyticsEvent="broadcast_channel_click"
                    analyticsSurface={surface}
                    analyticsEntityType={entityType}
                    analyticsEntityId={entityId}
                    analyticsAction={`broadcast:${broadcastQuickActions.primary.name}`}
                    analyticsMetadata={{
                      fixtureId: broadcastQuickActions.primary.fixtureId || null,
                      channelType: broadcastQuickActions.primary.channelType || null,
                    }}
                  >
                    {dictionary.openChannel}
                  </TrackedActionLink>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                {broadcastQuickActions.message || dictionary.broadcastUnavailable}
              </div>
            )}

            {broadcastQuickActions.secondary?.length ? (
              <div className={styles.inlineBadgeRow}>
                {broadcastQuickActions.secondary.map((entry) => (
                  <TrackedActionLink
                    key={entry.id}
                    href={entry.href}
                    external
                    className={styles.sectionAction}
                    analyticsEvent="broadcast_channel_click"
                    analyticsSurface={surface}
                    analyticsEntityType={entityType}
                    analyticsEntityId={entityId}
                    analyticsAction={`broadcast:${entry.name}`}
                    analyticsMetadata={{
                      fixtureId: entry.fixtureId || null,
                      channelType: entry.channelType || null,
                    }}
                  >
                    {entry.name}
                  </TrackedActionLink>
                ))}
              </div>
            ) : null}
          </article>
        </ModuleEngagementTracker>
      ) : null}

      <InsightCard
        moduleType="top_picks_widget"
        surface={surface}
        entityType={entityType}
        entityId={entityId}
        geo={ctaConfig?.geo || null}
        title={dictionary.liveBoardTopPicks}
        lead={primaryLead}
      >
        {insights?.topPicks?.length ? (
          <div className={styles.insightList}>
            {insights.topPicks.map((entry) => (
              <PredictionItem
                key={entry.key}
                locale={locale}
                surface={surface}
                pageEntityType={entityType}
                pageEntityId={entityId}
                entry={entry}
                dictionary={dictionary}
                affiliateActionLabel={affiliateActionLabel}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            {insights?.predictionMessage || dictionary.predictionRecommendationsEmpty}
          </div>
        )}
      </InsightCard>

      <InsightCard
        moduleType="best_odds_widget"
        surface={surface}
        entityType={entityType}
        entityId={entityId}
        geo={ctaConfig?.geo || null}
        title={dictionary.liveBoardBestOdds}
        lead={dictionary.liveBoardBestOddsLead}
      >
        {insights?.bestOdds?.length ? (
          <div className={styles.insightList}>
            {insights.bestOdds.map((entry) => (
              <OddsItem
                key={entry.key}
                locale={locale}
                surface={surface}
                pageEntityType={entityType}
                pageEntityId={entityId}
                entry={entry}
                dictionary={dictionary}
                affiliateActionLabel={affiliateActionLabel}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>{dictionary.oddsUnavailable}</div>
        )}
      </InsightCard>

      <InsightCard
        moduleType="high_odds_widget"
        surface={surface}
        entityType={entityType}
        entityId={entityId}
        geo={ctaConfig?.geo || null}
        title={dictionary.highOddsMatches}
        lead={dictionary.highOddsMatchesLead}
      >
        {insights?.highOddsMatches?.length ? (
          <div className={styles.insightList}>
            {insights.highOddsMatches.map((entry) => (
              <OddsItem
                key={entry.key}
                locale={locale}
                surface={surface}
                pageEntityType={entityType}
                pageEntityId={entityId}
                entry={entry}
                dictionary={dictionary}
                affiliateActionLabel={affiliateActionLabel}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>{dictionary.highOddsEmpty}</div>
        )}
      </InsightCard>

      <InsightCard
        moduleType="value_bets_widget"
        surface={surface}
        entityType={entityType}
        entityId={entityId}
        geo={ctaConfig?.geo || null}
        title={dictionary.liveBoardValueBets}
        lead={dictionary.liveBoardValueBetsLead}
      >
        {insights?.valueBets?.length ? (
          <div className={styles.insightList}>
            {insights.valueBets.map((entry) => (
              <PredictionItem
                key={entry.key}
                locale={locale}
                surface={surface}
                pageEntityType={entityType}
                pageEntityId={entityId}
                entry={entry}
                dictionary={dictionary}
                affiliateActionLabel={affiliateActionLabel}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            {insights?.predictionMessage || dictionary.predictionRecommendationsEmpty}
          </div>
        )}
      </InsightCard>

      {ctaConfig?.primaryAffiliate?.href || ctaConfig?.funnelActions?.length ? (
        <ModuleEngagementTracker
          moduleType="surface_partner_actions"
          entityType={entityType}
          entityId={entityId}
          surface={surface}
          metadata={{ geo: ctaConfig?.geo || null }}
        >
          <article className={styles.insightHero}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.eyebrow}>{dictionary.availableBookmakers}</p>
                <h3 className={styles.cardTitle}>{primaryLead}</h3>
                <p className={styles.sectionLead}>
                  {dictionary.currentMarket}: {ctaConfig?.territoryLabel || ctaConfig?.geoLabel}
                </p>
              </div>
              {ctaConfig?.bookmakers?.length ? (
                <span className={styles.badge}>{ctaConfig.bookmakers.length}</span>
              ) : null}
            </div>

            {ctaConfig?.bookmakers?.length ? (
              <div className={styles.inlineBadgeRow}>
                {ctaConfig.bookmakers.map((entry) => (
                  <span key={entry} className={styles.badge}>
                    {entry}
                  </span>
                ))}
              </div>
            ) : null}

            <div className={styles.insightActions}>
              {ctaConfig?.primaryAffiliate?.href ? (
                <TrackedActionLink
                  href={ctaConfig.primaryAffiliate.href}
                  external={ctaConfig.primaryAffiliate.external}
                  className={styles.actionLink}
                  analyticsEvent="odds_cta_click"
                  analyticsSurface={surface}
                  analyticsEntityType={entityType}
                  analyticsEntityId={entityId}
                  analyticsAction="primary-affiliate"
                  analyticsMetadata={{
                    partner: ctaConfig.primaryAffiliate.partner || null,
                  }}
                  affiliateClick={ctaConfig.primaryAffiliate}
                >
                  {ctaConfig.primaryAffiliate.external
                    ? affiliateActionLabel
                    : dictionary.openAffiliateHub}
                </TrackedActionLink>
              ) : null}

              {(ctaConfig?.funnelActions || []).map((entry) => (
                <TrackedActionLink
                  key={entry.key}
                  href={entry.href}
                  external
                  className={styles.sectionAction}
                  analyticsEvent="funnel_cta_click"
                  analyticsSurface={surface}
                  analyticsEntityType={entityType}
                  analyticsEntityId={entityId}
                  analyticsAction={`funnel:${entry.key}`}
                >
                  {entry.ctaLabel}
                </TrackedActionLink>
              ))}
            </div>
          </article>
        </ModuleEngagementTracker>
      ) : null}
    </div>
  );
}
