import Link from "next/link";
import styles from "./styles.module.css";
import { buildTeamHref } from "../../lib/coreui/routes";

function formTone(result) {
  if (result === "W") {
    return styles.formBadgeWin;
  }

  if (result === "L") {
    return styles.formBadgeLoss;
  }

  return styles.formBadgeDraw;
}

export function StandingsTable({
  rows = [],
  dictionary,
  locale,
  highlightTeamIds = [],
}) {
  if (!rows.length) {
    return <div className={styles.emptyState}>{dictionary.noData}</div>;
  }

  const highlighted = new Set((highlightTeamIds || []).filter(Boolean));

  return (
    <div className={styles.standingsTableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{dictionary.tablePosition}</th>
            <th>{dictionary.tableTeam}</th>
            <th>{dictionary.tablePlayed}</th>
            <th>{dictionary.tableWon}</th>
            <th>{dictionary.tableDrawn}</th>
            <th>{dictionary.tableLost}</th>
            <th>{dictionary.tableGoalsFor}</th>
            <th>{dictionary.tableGoalsAgainst}</th>
            <th>{dictionary.tableGoalDifference}</th>
            <th>{dictionary.tablePoints}</th>
            <th>{dictionary.tableForm}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.team.id}>
              <td>{row.position}</td>
              <td>
                <Link href={buildTeamHref(locale, row.team)}>
                  {highlighted.has(row.team.id) ? <strong>{row.team.name}</strong> : row.team.name}
                </Link>
              </td>
              <td>{row.played}</td>
              <td>{row.won}</td>
              <td>{row.drawn}</td>
              <td>{row.lost}</td>
              <td>{row.goalsFor}</td>
              <td>{row.goalsAgainst}</td>
              <td>{row.goalDifference}</td>
              <td>{row.points}</td>
              <td>
                <div className={styles.formStrip}>
                  {row.form.length ? (
                    row.form.map((result, index) => (
                      <span
                        key={`${row.team.id}-${result}-${index}`}
                        className={`${styles.formBadge} ${formTone(result)}`}
                      >
                        {result}
                      </span>
                    ))
                  ) : (
                    <span className={styles.muted}>-</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
