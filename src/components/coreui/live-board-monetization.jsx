"use client";

import Link from "next/link";
import { buildMatchHref } from "../../lib/coreui/routes";
import { ModuleEngagementTracker } from "./module-engagement-tracker";
import boardStyles from "./live-board.module.css";
import { usePreferences } from "./preferences-provider";
import sharedStyles from "./styles.module.css";

function ActionLink({ href, label, className, action, external = false }) {
  if (!href || !label) {
    return null;
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={className}
        data-analytics-action={action}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className} data-analytics-action={action}>
      {label}
    </Link>
  );
}

function WidgetCard({ eyebrow, title, lead, children, toneClass, tracker }) {
  return (
    <ModuleEngagementTracker
      moduleType={tracker.moduleType}
      entityType="surface"
      entityId={tracker.entityId}
      surface={tracker.surface}
      metadata={tracker.metadata}
    >
      <article className={toneClass ? `${boardStyles.widgetCard} ${toneClass}` : boardStyles.widgetCard}>
        <div className={boardStyles.widgetHead}>
          <div className={boardStyles.widgetCopy}>
            <p className={boardStyles.widgetEyebrow}>{eyebrow}</p>
            <h2 className={boardStyles.widgetTitle}>{title}</h2>
            <p className={boardStyles.widgetLead}>{lead}</p>
          </div>
        </div>
        <div className={boardStyles.widgetItems}>{children}</div>
      </article>
    </ModuleEngagementTracker>
  );
}

export function LiveBoardMonetization({
  locale,
  dictionary,
  monetization,
  surface = "live-board",
}) {
  const { compliance, promptPreferences, setPromptPreference } = usePreferences();

  if (!monetization) {
    return null;
  }

  const topPicks = monetization.topPicks || [];
  const bestOdds = monetization.bestOdds || [];
  const valueBets = monetization.valueBets || [];
  const funnelActions = monetization.funnelActions || [];
  const predictionsVisible = monetization.predictionsEnabled !== false;
  const hasBannerRow = Boolean(monetization.affiliate?.href) || funnelActions.length > 0;

  return (
    <section className={sharedStyles.section}>
      <div className={boardStyles.widgetGrid}>
        {predictionsVisible ? (
          <WidgetCard
            eyebrow={dictionary.liveBoardWidgetsEyebrow}
            title={dictionary.liveBoardTopPicks}
            lead={dictionary.liveBoardWidgetsLead}
            toneClass={boardStyles.widgetCardAccent}
            tracker={{
              moduleType: "board_top_picks",
              entityId: `${surface}-top-picks`,
              surface,
              metadata: { geo: monetization.geo },
            }}
          >
            {topPicks.length ? (
              topPicks.map((entry) => (
                <article key={entry.key} className={boardStyles.widgetItem}>
                  <div className={boardStyles.widgetMeta}>
                    <span className={boardStyles.widgetConfidence}>{entry.confidenceLabel || "--"}</span>
                    {entry.bookmaker ? <span className={sharedStyles.badge}>{entry.bookmaker}</span> : null}
                  </div>
                  <div className={boardStyles.widgetCopy}>
                    <h3 className={boardStyles.widgetItemTitle}>{entry.title}</h3>
                    {entry.fixtureLabel ? <p className={boardStyles.widgetLead}>{entry.fixtureLabel}</p> : null}
                    {entry.summary ? <p className={boardStyles.widgetLead}>{entry.summary}</p> : null}
                  </div>
                  <div className={boardStyles.widgetFoot}>
                    {entry.selectionLabel ? <span className={sharedStyles.badge}>{entry.selectionLabel}</span> : null}
                    {entry.priceLabel ? <strong className={boardStyles.widgetPrice}>{entry.priceLabel}</strong> : null}
                  </div>
                  <div className={boardStyles.bannerActions}>
                    <ActionLink
                      href={entry.fixtureRef ? buildMatchHref(locale, { externalRef: entry.fixtureRef }) : null}
                      label={dictionary.liveBoardOpenCenter}
                      className={sharedStyles.sectionAction}
                      action="top-pick-match"
                    />
                    <ActionLink
                      href={entry.ctaHref}
                      label={dictionary.liveBoardAffiliateAction}
                      className={sharedStyles.actionLink}
                      action="top-pick-affiliate"
                      external={entry.ctaExternal}
                    />
                  </div>
                </article>
              ))
            ) : (
              <div className={boardStyles.widgetEmpty}>{dictionary.liveBoardPredictionEmpty}</div>
            )}
          </WidgetCard>
        ) : null}

        <WidgetCard
          eyebrow={dictionary.liveBoardWidgetsEyebrow}
          title={dictionary.liveBoardBestOdds}
          lead={dictionary.liveBoardBestOddsLead}
          tracker={{
            moduleType: "board_best_odds",
            entityId: `${surface}-best-odds`,
            surface,
            metadata: { geo: monetization.geo },
          }}
        >
          {bestOdds.length ? (
            bestOdds.map((entry) => (
              <article key={entry.key} className={boardStyles.widgetItem}>
                <div className={boardStyles.widgetMeta}>
                  {entry.bookmaker ? <span className={sharedStyles.badge}>{entry.bookmaker}</span> : null}
                  {entry.marketType ? <span className={sharedStyles.badge}>{entry.marketType}</span> : null}
                </div>
                <div className={boardStyles.widgetCopy}>
                  <h3 className={boardStyles.widgetItemTitle}>{entry.fixtureLabel}</h3>
                  {entry.selectionLabel ? <p className={boardStyles.widgetLead}>{entry.selectionLabel}</p> : null}
                  {entry.competitionName ? <p className={boardStyles.widgetLead}>{entry.competitionName}</p> : null}
                </div>
                <div className={boardStyles.widgetFoot}>
                  {entry.priceLabel ? <strong className={boardStyles.widgetPrice}>{entry.priceLabel}</strong> : null}
                </div>
                <div className={boardStyles.bannerActions}>
                  <ActionLink
                    href={entry.fixtureRef ? buildMatchHref(locale, { externalRef: entry.fixtureRef }) : null}
                    label={dictionary.liveBoardOpenCenter}
                    className={sharedStyles.sectionAction}
                    action="best-odds-match"
                  />
                  <ActionLink
                    href={entry.ctaHref}
                    label={dictionary.liveBoardAffiliateAction}
                    className={sharedStyles.actionLink}
                    action="best-odds-affiliate"
                    external={entry.ctaExternal}
                  />
                </div>
              </article>
            ))
          ) : (
            <div className={boardStyles.widgetEmpty}>{dictionary.liveBoardOddsEmpty}</div>
          )}
        </WidgetCard>

        {predictionsVisible ? (
          <WidgetCard
            eyebrow={dictionary.liveBoardWidgetsEyebrow}
            title={dictionary.liveBoardValueBets}
            lead={dictionary.liveBoardValueBetsLead}
            toneClass={boardStyles.widgetCardWarm}
            tracker={{
              moduleType: "board_value_bets",
              entityId: `${surface}-value-bets`,
              surface,
              metadata: { geo: monetization.geo },
            }}
          >
            {valueBets.length ? (
              valueBets.map((entry) => (
                <article key={entry.key} className={boardStyles.widgetItem}>
                  <div className={boardStyles.widgetMeta}>
                    {entry.edgeScore != null ? (
                      <span className={boardStyles.widgetMetric}>
                        {dictionary.predictionEdge} {entry.edgeScore.toFixed(1)}
                      </span>
                    ) : null}
                    {entry.bookmaker ? <span className={sharedStyles.badge}>{entry.bookmaker}</span> : null}
                  </div>
                  <div className={boardStyles.widgetCopy}>
                    <h3 className={boardStyles.widgetItemTitle}>{entry.title}</h3>
                    {entry.fixtureLabel ? <p className={boardStyles.widgetLead}>{entry.fixtureLabel}</p> : null}
                    {entry.selectionLabel ? <p className={boardStyles.widgetLead}>{entry.selectionLabel}</p> : null}
                  </div>
                  <div className={boardStyles.widgetFoot}>
                    {entry.priceLabel ? <strong className={boardStyles.widgetPrice}>{entry.priceLabel}</strong> : null}
                  </div>
                  <div className={boardStyles.bannerActions}>
                    <ActionLink
                      href={entry.fixtureRef ? buildMatchHref(locale, { externalRef: entry.fixtureRef }) : null}
                      label={dictionary.liveBoardOpenCenter}
                      className={sharedStyles.sectionAction}
                      action="value-bet-match"
                    />
                    <ActionLink
                      href={entry.ctaHref}
                      label={dictionary.liveBoardAffiliateAction}
                      className={sharedStyles.actionLink}
                      action="value-bet-affiliate"
                      external={entry.ctaExternal}
                    />
                  </div>
                </article>
              ))
            ) : (
              <div className={boardStyles.widgetEmpty}>{dictionary.liveBoardPredictionEmpty}</div>
            )}
          </WidgetCard>
        ) : null}
      </div>

      {hasBannerRow ? (
        <div className={boardStyles.widgetGrid}>
          {monetization.affiliate?.href ? (
            <ModuleEngagementTracker
              moduleType="board_partner_banner"
              entityType="surface"
              entityId={`${surface}-partner`}
              surface={surface}
              metadata={{ geo: monetization.geo }}
            >
              <article className={boardStyles.bannerCard}>
                <div className={boardStyles.bannerHead}>
                  <div className={boardStyles.bannerCopy}>
                    <p className={boardStyles.widgetEyebrow}>{dictionary.liveBoardAffiliateTitle}</p>
                    <h2 className={boardStyles.bannerTitle}>{dictionary.liveBoardAffiliateLead}</h2>
                    <p className={boardStyles.bannerLead}>
                      {dictionary.currentMarket}: {monetization.geoLabel}
                    </p>
                  </div>
                  <strong className={boardStyles.bannerPartner}>
                    {monetization.affiliate.partner || dictionary.affiliatesTitle}
                  </strong>
                </div>

                <div className={boardStyles.bannerActions}>
                  {monetization.bookmakers?.slice(0, 4).map((bookmaker) => (
                    <span key={bookmaker} className={sharedStyles.badge}>
                      {bookmaker}
                    </span>
                  ))}
                </div>

                <ActionLink
                  href={monetization.affiliate.href}
                  label={
                    monetization.affiliate.external
                      ? dictionary.liveBoardAffiliateAction
                      : dictionary.liveBoardAffiliateFallbackAction
                  }
                  className={sharedStyles.actionLink}
                  action="partner-banner-affiliate"
                  external={monetization.affiliate.external}
                />
              </article>
            </ModuleEngagementTracker>
          ) : null}

          {funnelActions.length ? (
            <ModuleEngagementTracker
              moduleType="board_funnel_banner"
              entityType="surface"
              entityId={`${surface}-funnels`}
              surface={surface}
              metadata={{ geo: monetization.geo }}
            >
              <article className={boardStyles.bannerCard}>
                <div className={boardStyles.bannerHead}>
                  <div className={boardStyles.bannerCopy}>
                    <p className={boardStyles.widgetEyebrow}>{dictionary.liveBoardFunnelTitle}</p>
                    <h2 className={boardStyles.bannerTitle}>{dictionary.liveBoardFunnelLead}</h2>
                    <p className={boardStyles.bannerLead}>
                      {dictionary.currentMarket}: {monetization.geoLabel}
                    </p>
                  </div>
                  <span className={sharedStyles.badge}>{funnelActions.length}</span>
                </div>

                {!compliance.promptOptInAllowed ? (
                  <p className={boardStyles.bannerLead}>{dictionary.promptOptInUnavailable}</p>
                ) : !promptPreferences.funnelPrompts ? (
                  <div className={boardStyles.bannerActions}>
                    <button
                      type="button"
                      className={sharedStyles.actionLink}
                      onClick={() => setPromptPreference("funnelPrompts", true)}
                      data-analytics-action="enable-board-funnels"
                    >
                      {dictionary.liveBoardFunnelOptIn}
                    </button>
                    <Link href={`/${locale}/settings`} className={sharedStyles.sectionAction}>
                      {dictionary.metaSettingsTitle}
                    </Link>
                  </div>
                ) : (
                  <div className={boardStyles.bannerActions}>
                    {funnelActions.map((action) => (
                      <a
                        key={action.key}
                        href={action.url}
                        target="_blank"
                        rel="noreferrer"
                        className={sharedStyles.actionLink}
                        data-analytics-action={`funnel-${action.key}`}
                      >
                        {action.key === "telegram" ? dictionary.openTelegram : dictionary.openWhatsApp}
                      </a>
                    ))}
                  </div>
                )}
              </article>
            </ModuleEngagementTracker>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
