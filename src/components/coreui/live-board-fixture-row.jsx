import Link from "next/link";
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

export function LiveBoardFixtureRow({ fixture, locale, dictionary, surface = "live-board" }) {
  const matchHref = buildMatchHref(locale, fixture);
  const competitionHref = fixture.league?.code ? buildCompetitionHref(locale, fixture.league) : null;
  const fixtureLabel = `${fixture.homeTeam?.name} vs ${fixture.awayTeam?.name}`;
  const signals = buildLiveBoardFixtureSignals(fixture, locale);
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
    <article className={boardStyles.fixtureRow}>
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
          <div className={boardStyles.rowTeams}>
            <div className={boardStyles.rowTeam}>
              <span className={boardStyles.rowTeamName}>
                {fixture.homeTeam?.shortName || fixture.homeTeam?.name}
              </span>
              <strong className={boardStyles.rowScore}>{fixture.resultSnapshot?.homeScore ?? "-"}</strong>
            </div>

            <div className={boardStyles.rowTeam}>
              <span className={boardStyles.rowTeamName}>
                {fixture.awayTeam?.shortName || fixture.awayTeam?.name}
              </span>
              <strong className={boardStyles.rowScore}>{fixture.resultSnapshot?.awayScore ?? "-"}</strong>
            </div>
          </div>

          <div className={boardStyles.rowMeta}>
            {fixture.resultSnapshot?.statusText ? (
              <span className={sharedStyles.badge}>{fixture.resultSnapshot.statusText}</span>
            ) : null}
            {competitionHref ? <span className={sharedStyles.badge}>{fixture.league?.name}</span> : null}
          </div>

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
    </article>
  );
}
