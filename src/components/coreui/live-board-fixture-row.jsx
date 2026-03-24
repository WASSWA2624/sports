import Link from "next/link";
import { formatDictionaryText } from "../../lib/coreui/dictionaries";
import { AlertSubscriptionControl } from "./alert-subscription-control";
import { FavoriteToggle } from "./favorite-toggle";
import boardStyles from "./live-board.module.css";
import sharedStyles from "./styles.module.css";
import { buildLiveBoardFixtureSignals } from "../../lib/coreui/live-board";
import { formatKickoff } from "../../lib/coreui/format";
import { buildCompetitionHref, buildMatchHref } from "../../lib/coreui/routes";

function signalTone(signal) {
  if (signal === "warning") {
    return boardStyles.signalChipWarning;
  }

  if (signal === "success") {
    return boardStyles.signalChipSuccess;
  }

  return boardStyles.signalChip;
}

function CardSignal({ code, count, toneClass, title }) {
  if (!count) {
    return null;
  }

  return (
    <span className={`${boardStyles.rowCardSignal} ${toneClass}`} title={title}>
      {code}
      {count}
    </span>
  );
}

function TeamSignals({ tally, dictionary }) {
  if (!tally || (!tally.yellow && !tally.red)) {
    return null;
  }

  return (
    <div className={boardStyles.rowTeamSignals}>
      <CardSignal
        code="Y"
        count={tally.yellow}
        toneClass={boardStyles.rowCardSignalYellow}
        title={formatDictionaryText(dictionary.incidentYellows, { count: tally.yellow })}
      />
      <CardSignal
        code="R"
        count={tally.red}
        toneClass={boardStyles.rowCardSignalRed}
        title={formatDictionaryText(dictionary.incidentReds, { count: tally.red })}
      />
    </div>
  );
}

export function LiveBoardFixtureRow({ fixture, locale, dictionary, surface = "live-board" }) {
  const matchHref = buildMatchHref(locale, fixture);
  const competitionHref = fixture.league?.code ? buildCompetitionHref(locale, fixture.league) : null;
  const fixtureLabel = `${fixture.homeTeam?.name} vs ${fixture.awayTeam?.name}`;
  const signals = buildLiveBoardFixtureSignals(fixture, locale);
  const homeCards = signals.teamCards?.home || { yellow: 0, red: 0 };
  const awayCards = signals.teamCards?.away || { yellow: 0, red: 0 };
  const signalBadges = [
    signals.staleLabel ? { label: signals.staleLabel, tone: "warning" } : null,
    signals.isFrozen && signals.freezeLabel
      ? { label: signals.freezeLabel, tone: "success" }
      : null,
    !signals.isFrozen && signals.refresh.enabled
      ? { label: signals.refresh.label, tone: "default" }
      : null,
    ...signals.incidentIndicators.map((label) => ({ label, tone: "default" })),
  ].filter(Boolean);

  return (
    <article
      className={
        fixture.status === "LIVE"
          ? `${boardStyles.fixtureRow} ${boardStyles.fixtureRowLive}`
          : boardStyles.fixtureRow
      }
    >
      <div className={boardStyles.rowState}>
        <span className={fixture.status === "LIVE" ? sharedStyles.liveBadge : sharedStyles.badge}>
          {signals.statusLabel}
        </span>
        <span className={boardStyles.rowMetaLine}>{formatKickoff(fixture.startsAt, locale)}</span>
        {fixture.round ? <span className={boardStyles.rowMetaLine}>{fixture.round}</span> : null}
        {fixture.venue ? <span className={boardStyles.rowMetaLine}>{fixture.venue}</span> : null}
      </div>

      <div className={boardStyles.rowBody}>
        <Link href={matchHref} className={boardStyles.rowMainLink} data-analytics-action="open-match-center">
          <div className={boardStyles.rowTopline}>
            {fixture.league?.name ? <span className={sharedStyles.badge}>{fixture.league.name}</span> : null}
            {fixture.resultSnapshot?.statusText ? (
              <span className={sharedStyles.badge}>{fixture.resultSnapshot.statusText}</span>
            ) : null}
          </div>

          <div className={boardStyles.rowTeams}>
            <div className={boardStyles.rowTeam}>
              <span className={boardStyles.rowTeamName}>
                {fixture.homeTeam?.shortName || fixture.homeTeam?.name}
              </span>
              <TeamSignals tally={homeCards} dictionary={dictionary} />
              <strong className={boardStyles.rowScore}>{fixture.resultSnapshot?.homeScore ?? "-"}</strong>
            </div>

            <div className={boardStyles.rowTeam}>
              <span className={boardStyles.rowTeamName}>
                {fixture.awayTeam?.shortName || fixture.awayTeam?.name}
              </span>
              <TeamSignals tally={awayCards} dictionary={dictionary} />
              <strong className={boardStyles.rowScore}>{fixture.resultSnapshot?.awayScore ?? "-"}</strong>
            </div>
          </div>

          {signals.keyMomentLabel ? (
            <p className={boardStyles.rowMoment}>{signals.keyMomentLabel}</p>
          ) : null}

          {signalBadges.length ? (
            <div className={boardStyles.signalList}>
              {signalBadges.map((signal) => (
                <span key={signal.label} className={signalTone(signal.tone)}>
                  {signal.label}
                </span>
              ))}
            </div>
          ) : null}
        </Link>
      </div>

      <div className={boardStyles.rowActions}>
        <div className={boardStyles.rowUtilityActions}>
          <FavoriteToggle
            itemId={`fixture:${fixture.id}`}
            locale={locale}
            compact
            label={fixtureLabel}
            metadata={{
              leagueCode: fixture.league?.code || null,
            }}
            surface={`${surface}-row`}
          />
          <AlertSubscriptionControl
            itemId={`fixture:${fixture.id}`}
            locale={locale}
            supportedTypes={["KICKOFF", "GOAL", "CARD", "PERIOD_CHANGE", "FINAL_RESULT", "NEWS"]}
            compact
            label={fixtureLabel}
            metadata={{
              leagueCode: fixture.league?.code || null,
            }}
            surface={`${surface}-row`}
          />
        </div>

        <div className={boardStyles.rowPrimaryActions}>
          <Link href={matchHref} className={sharedStyles.actionLink} data-analytics-action="open-center">
            {dictionary.liveBoardOpenCenter}
          </Link>
          {competitionHref ? (
            <Link
              href={competitionHref}
              className={sharedStyles.sectionAction}
              data-analytics-action="open-competition"
            >
              {dictionary.liveBoardOpenLeague}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
