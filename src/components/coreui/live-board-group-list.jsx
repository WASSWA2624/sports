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

function buildPreferenceWeightMap(itemIds = []) {
  const size = itemIds.length;

  return itemIds.reduce((accumulator, itemId, index) => {
    accumulator.set(itemId, Math.max(1, size - index));
    return accumulator;
  }, new Map());
}

function getFixturePriorityScore(fixture, favoriteItems, recentWeights) {
  const fixtureId = fixture?.id ? `fixture:${fixture.id}` : null;
  const homeTeamId = fixture?.homeTeamId || fixture?.homeTeam?.id;
  const awayTeamId = fixture?.awayTeamId || fixture?.awayTeam?.id;
  const competitionId = fixture?.league?.code ? `competition:${fixture.league.code}` : null;
  let score = 0;

  if (fixtureId && favoriteItems.has(fixtureId)) {
    score += 900;
  }

  if (homeTeamId && favoriteItems.has(`team:${homeTeamId}`)) {
    score += 360;
  }

  if (awayTeamId && favoriteItems.has(`team:${awayTeamId}`)) {
    score += 360;
  }

  if (competitionId && favoriteItems.has(competitionId)) {
    score += 700;
  }

  if (fixtureId) {
    score += (recentWeights.get(fixtureId) || 0) * 90;
  }

  if (homeTeamId) {
    score += (recentWeights.get(`team:${homeTeamId}`) || 0) * 50;
  }

  if (awayTeamId) {
    score += (recentWeights.get(`team:${awayTeamId}`) || 0) * 50;
  }

  if (competitionId) {
    score += (recentWeights.get(competitionId) || 0) * 75;
  }

  if (fixture?.status === "LIVE") {
    score += 40;
  }

  return score;
}

function getGroupPriorityScore(group, favoriteItems, recentWeights) {
  const competitionId = group?.leagueCode ? `competition:${group.leagueCode}` : null;
  const fixtureScores = (group?.fixtures || []).map((fixture) =>
    getFixturePriorityScore(fixture, favoriteItems, recentWeights)
  );
  let score = fixtureScores.reduce((highest, value) => Math.max(highest, value), 0);

  if (competitionId && favoriteItems.has(competitionId)) {
    score += 1000;
  }

  if (competitionId) {
    score += (recentWeights.get(competitionId) || 0) * 90;
  }

  score += (group?.summary?.LIVE || 0) * 18;
  score += (group?.summary?.total || 0) * 4;

  return score;
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
  const { isWatched, recentViews, watchlist } = usePreferences();
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState([]);
  const favoriteItems = new Set(watchlist || []);
  const recentWeights = buildPreferenceWeightMap(recentViews || []);

  if (!groups.length) {
    return <div className={sharedStyles.emptyState}>{emptyLabel || dictionary.noData}</div>;
  }

  const orderedGroups = [...groups].sort((left, right) => {
    const leftScore = getGroupPriorityScore(left, favoriteItems, recentWeights);
    const rightScore = getGroupPriorityScore(right, favoriteItems, recentWeights);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
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
      <div className={boardStyles.boardSectionHeader}>
        <div className={boardStyles.boardSectionIntro}>
          <p className={sharedStyles.eyebrow}>{dictionary.liveNow}</p>
          <h2 className={sharedStyles.sectionTitle}>{dictionary.leagues}</h2>
        </div>

        <div className={boardStyles.toolbar}>
          <div className={boardStyles.toolbarMeta}>
            <span className={sharedStyles.badge}>{orderedGroups.length}</span>
            <span className={sharedStyles.badge}>{dictionary.fixtures}: {groups.reduce((count, group) => count + (group.summary?.total || 0), 0)}</span>
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
      </div>

      {pinnedCount ? (
        <div className={boardStyles.toolbarMeta}>
          {pinnedCount ? (
            <span className={sharedStyles.badge}>
              {dictionary.liveBoardPinnedFirst} {pinnedCount}
            </span>
          ) : null}
        </div>
      ) : null}

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
                  <div className={boardStyles.groupOverview}>
                    <div className={boardStyles.groupCopy}>
                      <p className={sharedStyles.eyebrow}>{group.country || dictionary.international}</p>
                      <h2 className={sharedStyles.sectionTitle}>
                        {competitionHref ? (
                          <Link href={competitionHref}>{group.leagueName || dictionary.competition}</Link>
                        ) : (
                          group.leagueName || dictionary.competition
                        )}
                      </h2>
                    </div>

                    <div className={boardStyles.groupSummaryGrid}>
                      <div className={boardStyles.groupSummaryStat}>
                        <strong>{group.summary?.LIVE || 0}</strong>
                        <span>{dictionary.live}</span>
                      </div>
                      <div className={boardStyles.groupSummaryStat}>
                        <strong>{group.summary?.FINISHED || 0}</strong>
                        <span>{dictionary.results}</span>
                      </div>
                      <div className={boardStyles.groupSummaryStat}>
                        <strong>{group.summary?.SCHEDULED || 0}</strong>
                        <span>{dictionary.fixtures}</span>
                      </div>
                    </div>

                    {group.completedSummary ? (
                      <div className={boardStyles.groupHighlightPills}>
                        <span className={sharedStyles.badge}>{group.completedSummary.label}</span>
                      </div>
                    ) : null}
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
                    <div className={boardStyles.groupFixtureHead}>
                      <div className={boardStyles.groupCopy}>
                        <p className={sharedStyles.eyebrow}>{dictionary.fixtures}</p>
                        <p className={boardStyles.groupFixtureSummary}>
                          {group.summary?.total || 0} · {dictionary.fixtures}
                        </p>
                      </div>

                      <div className={boardStyles.groupHighlightPills}>
                        {(group.summary?.LIVE || 0) > 0 ? (
                          <span className={sharedStyles.liveBadge}>
                            {dictionary.live} {group.summary?.LIVE || 0}
                          </span>
                        ) : null}
                        {(group.summary?.FINISHED || 0) > 0 ? (
                          <span className={sharedStyles.badge}>
                            {dictionary.results} {group.summary?.FINISHED || 0}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className={boardStyles.fixtureRows}>
                      {[...(group.fixtures || [])]
                        .sort((leftFixture, rightFixture) => {
                          const rightScore = getFixturePriorityScore(
                            rightFixture,
                            favoriteItems,
                            recentWeights
                          );
                          const leftScore = getFixturePriorityScore(
                            leftFixture,
                            favoriteItems,
                            recentWeights
                          );

                          if (rightScore !== leftScore) {
                            return rightScore - leftScore;
                          }

                          return (
                            new Date(leftFixture.startsAt).getTime() -
                            new Date(rightFixture.startsAt).getTime()
                          );
                        })
                        .map((fixture) => (
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
