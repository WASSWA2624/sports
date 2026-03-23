import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/coreui/metadata";
import { getDictionary } from "../../../../lib/coreui/dictionaries";
import { formatFixtureStatus, formatKickoff } from "../../../../lib/coreui/format";
import { getFixtureDetail } from "../../../../lib/coreui/read";
import { FavoriteToggle } from "../../../../components/coreui/favorite-toggle";
import styles from "../../../../components/coreui/styles.module.css";

export async function generateMetadata({ params }) {
  const { locale, fixtureRef } = await params;
  const fixture = await getFixtureDetail(fixtureRef);

  return buildPageMetadata(
    locale,
    fixture ? `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}` : "Match",
    fixture
      ? `Match detail for ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}.`
      : "Sports match detail page.",
    `/match/${fixtureRef}`
  );
}

export default async function MatchDetailPage({ params }) {
  const { locale, fixtureRef } = await params;
  const dictionary = getDictionary(locale);
  const fixture = await getFixtureDetail(fixtureRef);

  if (!fixture) {
    notFound();
  }

  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{fixture.league.name}</p>
          <h1 className={styles.pageTitle}>
            {fixture.homeTeam.name} vs {fixture.awayTeam.name}
          </h1>
        </div>
        <FavoriteToggle itemId={`fixture:${fixture.id}`} locale={locale} />
      </header>

      <div className={styles.detailGrid}>
        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{dictionary.overview}</h2>
            <span className={fixture.status === "LIVE" ? styles.liveBadge : styles.badge}>
              {formatFixtureStatus(fixture.status, locale)}
            </span>
          </div>
          <div className={styles.scoreLine}>
            <div>
              <span>{fixture.homeTeam.name}</span>
              <strong>{fixture.resultSnapshot?.homeScore ?? "-"}</strong>
            </div>
            <div>
              <span>{fixture.awayTeam.name}</span>
              <strong>{fixture.resultSnapshot?.awayScore ?? "-"}</strong>
            </div>
          </div>
          <div className={styles.detailMeta}>
            <span>{formatKickoff(fixture.startsAt, locale)}</span>
            {fixture.venue ? <span>{fixture.venue}</span> : null}
            {fixture.round ? <span>{fixture.round}</span> : null}
            {fixture.resultSnapshot?.statusText ? <span>{fixture.resultSnapshot.statusText}</span> : null}
          </div>
        </article>

        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Competition</h2>
          </div>
          <div className={styles.section}>
            <Link href={`/${locale}/leagues/${fixture.league.code}`} className={styles.actionLink}>
              {fixture.league.name}
            </Link>
            <Link href={`/${locale}/teams/${fixture.homeTeam.id}`} className={styles.badge}>
              {fixture.homeTeam.name}
            </Link>
            <Link href={`/${locale}/teams/${fixture.awayTeam.id}`} className={styles.badge}>
              {fixture.awayTeam.name}
            </Link>
          </div>
        </article>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.matchDetail}</p>
            <h2 className={styles.sectionTitle}>Markets</h2>
          </div>
        </div>
        {fixture.oddsMarkets.length ? (
          <div className={styles.grid}>
            {fixture.oddsMarkets.map((market) => (
              <article key={market.id} className={styles.detailCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>{market.marketType}</h3>
                    <p className={styles.muted}>{market.bookmaker}</p>
                  </div>
                  <span className={styles.badge}>{market.suspended ? "Suspended" : "Open"}</span>
                </div>
                <div className={styles.grid}>
                  {market.selections.map((selection) => (
                    <div key={selection.id} className={styles.panel}>
                      <strong>{selection.label}</strong>
                      <p className={styles.muted}>{selection.priceDecimal.toString()}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>Odds coverage is not available for this fixture yet.</div>
        )}
      </section>
    </section>
  );
}
