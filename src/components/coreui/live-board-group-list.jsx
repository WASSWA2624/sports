"use client";

import Link from "next/link";
import { useState } from "react";
import { getStandingViewLabel } from "../../lib/coreui/dictionaries";
import { buildCompetitionHref } from "../../lib/coreui/routes";
import { LiveBoardFixtureRow } from "./live-board-fixture-row";
import { LiveBoardPinButton } from "./live-board-pin-button";
import boardStyles from "./live-board.module.css";
import { ModuleEngagementTracker } from "./module-engagement-tracker";
import { usePreferences } from "./preferences-provider";
import sharedStyles from "./styles.module.css";

function movementTone(movement) {
  if (movement > 0) {
    return boardStyles.movementUp;
  }

  if (movement < 0) {
    return boardStyles.movementDown;
  }

  return boardStyles.movementFlat;
}

function movementLabel(movement) {
  if (movement > 0) {
    return `+${movement}`;
  }

  if (movement < 0) {
    return String(movement);
  }

  return "=";
}

function InlineAffiliateCard({ locale, dictionary, monetization, surface }) {
  if (!monetization?.affiliate?.href) {
    return null;
  }

  const content = (
    <>
      <div className={boardStyles.bannerHead}>
        <div className={boardStyles.bannerCopy}>
          <p className={boardStyles.widgetEyebrow}>{dictionary.liveBoardAffiliateTitle}</p>
          <h3 className={boardStyles.bannerTitle}>{monetization.affiliate.partner || dictionary.affiliatesTitle}</h3>
          <p className={boardStyles.bannerLead}>{dictionary.liveBoardAffiliateLead}</p>
        </div>
        <span className={sharedStyles.badge}>{monetization.geoLabel}</span>
      </div>

      <div className={boardStyles.bannerActions}>
        {monetization.bookmakers?.slice(0, 3).map((bookmaker) => (
          <span key={bookmaker} className={sharedStyles.badge}>
            {bookmaker}
          </span>
        ))}
      </div>

      {monetization.affiliate.external ? (
        <a
          href={monetization.affiliate.href}
          target="_blank"
          rel="noreferrer"
          className={sharedStyles.actionLink}
          data-analytics-action="inline-affiliate-cta"
        >
          {dictionary.liveBoardAffiliateAction}
        </a>
      ) : (
        <Link
          href={monetization.affiliate.href}
          className={sharedStyles.actionLink}
          data-analytics-action="inline-affiliate-internal"
        >
          {dictionary.liveBoardAffiliateFallbackAction}
        </Link>
      )}
    </>
  );

  return (
    <ModuleEngagementTracker
      moduleType="board_affiliate_cta"
      entityType="surface"
      entityId={surface}
      surface={surface}
      metadata={{ geo: monetization.geo }}
    >
      <article className={boardStyles.inlinePromoCard}>{content}</article>
    </ModuleEngagementTracker>
  );
}

function InlineAdCard({ dictionary, monetization, surface }) {
  if (!monetization?.adInsert) {
    return null;
  }

  return (
    <ModuleEngagementTracker
      moduleType="board_inline_ad"
      entityType="surface"
      entityId={`${surface}-ad`}
      surface={surface}
      metadata={{ placement: monetization.adInsert.placement || null }}
    >
      <article className={boardStyles.adInsertCard}>
        <div className={boardStyles.bannerHead}>
          <div className={boardStyles.bannerCopy}>
            <p className={boardStyles.widgetEyebrow}>{dictionary.liveBoardInlineAdLabel}</p>
            <h3 className={boardStyles.bannerTitle}>
              {monetization.adInsert.placement || dictionary.adSlot}
            </h3>
            <p className={boardStyles.adCopy}>
              {monetization.adInsert.copy || dictionary.liveBoardInlineAdCopy}
            </p>
          </div>
          {monetization.adInsert.size ? (
            <span className={sharedStyles.badge}>{monetization.adInsert.size}</span>
          ) : null}
        </div>

        {monetization.adInsert.ctaHref && monetization.adInsert.ctaLabel ? (
          <a
            href={monetization.adInsert.ctaHref}
            target="_blank"
            rel="noreferrer"
            className={sharedStyles.sectionAction}
            data-analytics-action="inline-ad-cta"
          >
            {monetization.adInsert.ctaLabel}
          </a>
        ) : null}
      </article>
    </ModuleEngagementTracker>
  );
}

export function LiveBoardGroupList({
  locale,
  dictionary,
  groups = [],
  monetization = null,
  surface = "live-board",
  emptyLabel,
}) {
  const { isWatched } = usePreferences();
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState([]);

  if (!groups.length) {
    return <div className={sharedStyles.emptyState}>{emptyLabel || dictionary.noData}</div>;
  }

  const orderedGroups = [...groups].sort((left, right) => {
    const leftPinned = left.leagueCode ? isWatched(`competition:${left.leagueCode}`) : false;
    const rightPinned = right.leagueCode ? isWatched(`competition:${right.leagueCode}`) : false;

    if (leftPinned !== rightPinned) {
      return leftPinned ? -1 : 1;
    }

    if ((right.summary?.LIVE || 0) !== (left.summary?.LIVE || 0)) {
      return (right.summary?.LIVE || 0) - (left.summary?.LIVE || 0);
    }

    if ((right.summary?.total || 0) !== (left.summary?.total || 0)) {
      return (right.summary?.total || 0) - (left.summary?.total || 0);
    }

    return (left.leagueName || "").localeCompare(right.leagueName || "");
  });
  const pinnedCount = orderedGroups.filter(
    (group) => group.leagueCode && isWatched(`competition:${group.leagueCode}`)
  ).length;
  const allCollapsed = collapsedGroupKeys.length >= orderedGroups.length;

  function toggleGroup(key) {
    setCollapsedGroupKeys((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]
    );
  }

  function setEveryGroupCollapsed(nextValue) {
    setCollapsedGroupKeys(nextValue ? orderedGroups.map((group) => group.key) : []);
  }

  return (
    <section className={sharedStyles.section}>
      <div className={boardStyles.toolbar}>
        <div className={boardStyles.toolbarMeta}>
          {pinnedCount ? (
            <span className={sharedStyles.badge}>
              {dictionary.liveBoardPinnedFirst} {pinnedCount}
            </span>
          ) : null}
          <span className={sharedStyles.badge}>{orderedGroups.length}</span>
        </div>

        <div className={boardStyles.groupControls}>
          <button
            type="button"
            className={allCollapsed ? boardStyles.groupToggle : boardStyles.groupToggleActive}
            onClick={() => setEveryGroupCollapsed(false)}
            data-analytics-action="expand-all-groups"
          >
            {dictionary.liveBoardExpandAll}
          </button>
          <button
            type="button"
            className={allCollapsed ? boardStyles.groupToggleActive : boardStyles.groupToggle}
            onClick={() => setEveryGroupCollapsed(true)}
            data-analytics-action="collapse-all-groups"
          >
            {dictionary.liveBoardCollapseAll}
          </button>
        </div>
      </div>

      <div className={boardStyles.groupList}>
        {orderedGroups.map((group, index) => {
          const competitionHref = group.leagueCode
            ? buildCompetitionHref(locale, { code: group.leagueCode })
            : null;
          const isOpen = !collapsedGroupKeys.includes(group.key);

          return (
            <div key={group.key} className={boardStyles.groupList}>
              <section className={boardStyles.groupCard}>
                <div className={boardStyles.groupHeader}>
                  <div className={boardStyles.groupCopy}>
                    <p className={sharedStyles.eyebrow}>{group.country || dictionary.international}</p>
                    <h2 className={sharedStyles.sectionTitle}>
                      {competitionHref ? (
                        <Link href={competitionHref}>{group.leagueName || dictionary.competition}</Link>
                      ) : (
                        group.leagueName || dictionary.competition
                      )}
                    </h2>
                    <div className={boardStyles.groupMetrics}>
                      <span className={sharedStyles.badge}>
                        {dictionary.live}: {group.summary?.LIVE || 0}
                      </span>
                      <span className={sharedStyles.badge}>
                        {dictionary.results}: {group.summary?.FINISHED || 0}
                      </span>
                      <span className={sharedStyles.badge}>
                        {dictionary.fixtures}: {group.summary?.SCHEDULED || 0}
                      </span>
                      {group.completedSummary ? (
                        <span className={sharedStyles.badge}>{group.completedSummary.label}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className={boardStyles.groupControls}>
                    {group.leagueCode ? (
                      <LiveBoardPinButton
                        itemId={`competition:${group.leagueCode}`}
                        inactiveLabel={dictionary.liveBoardPin}
                        activeLabel={dictionary.liveBoardPinned}
                        label={group.leagueName || dictionary.competition}
                        metadata={{
                          country: group.country || null,
                        }}
                        surface={surface}
                      />
                    ) : null}
                    {competitionHref ? (
                      <Link href={competitionHref} className={sharedStyles.sectionAction}>
                        {dictionary.liveBoardOpenLeague}
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className={isOpen ? boardStyles.groupToggleActive : boardStyles.groupToggle}
                      onClick={() => toggleGroup(group.key)}
                      data-analytics-action={isOpen ? "collapse-group" : "expand-group"}
                    >
                      {isOpen ? dictionary.liveBoardCloseGroup : dictionary.liveBoardOpenGroup}
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <>
                    <div className={boardStyles.fixtureRows}>
                      {group.fixtures.map((fixture) => (
                        <LiveBoardFixtureRow
                          key={fixture.id}
                          fixture={fixture}
                          locale={locale}
                          dictionary={dictionary}
                          surface={surface}
                        />
                      ))}
                    </div>

                    {group.standingsPreview?.available ? (
                      <div className={boardStyles.standingsPreview}>
                        <div className={boardStyles.standingsHead}>
                          <div className={boardStyles.groupCopy}>
                            <p className={sharedStyles.eyebrow}>{dictionary.liveBoardLiveTable}</p>
                            <p className={boardStyles.standingsMeta}>
                              {getStandingViewLabel(group.standingsPreview.selectedView, dictionary)}
                            </p>
                          </div>
                          <span className={sharedStyles.badge}>
                            {group.standingsPreview.rows.length}
                          </span>
                        </div>

                        <div className={boardStyles.standingsRows}>
                          {group.standingsPreview.rows.map((row) => (
                            <div
                              key={row.team.id}
                              className={
                                row.isHighlighted
                                  ? `${boardStyles.standingsRow} ${boardStyles.standingsRowHighlight}`
                                  : boardStyles.standingsRow
                              }
                            >
                              <strong>{row.position}</strong>
                              <span className={boardStyles.standingsTeam}>
                                {row.team.shortName || row.team.name}
                              </span>
                              <strong className={boardStyles.standingsPoints}>{row.points}</strong>
                              <span className={movementTone(row.movement)}>
                                {movementLabel(row.movement)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </section>

              {index === 0 ? (
                <InlineAffiliateCard
                  locale={locale}
                  dictionary={dictionary}
                  monetization={monetization}
                  surface={surface}
                />
              ) : null}

              {(index + 1) % 3 === 0 ? (
                <InlineAdCard dictionary={dictionary} monetization={monetization} surface={surface} />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
