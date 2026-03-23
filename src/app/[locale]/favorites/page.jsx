import Link from "next/link";
import { AlertSubscriptionControl } from "../../../components/coreui/alert-subscription-control";
import {
  FavoriteReminderPanel,
  RecentItemsPanel,
} from "../../../components/coreui/discovery-panels";
import { FavoriteToggle } from "../../../components/coreui/favorite-toggle";
import { FixtureCard } from "../../../components/coreui/fixture-card";
import { PersonalizationUsageTracker } from "../../../components/coreui/personalization-usage-tracker";
import styles from "../../../components/coreui/styles.module.css";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getRecentItemsModule } from "../../../lib/coreui/discovery";
import { buildCompetitionHref, buildMatchHref, buildTeamHref } from "../../../lib/coreui/routes";
import {
  getFavoritesPageData,
  getPersonalizationSnapshot,
  getPersonalizationUsage,
} from "../../../lib/personalization";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return buildPageMetadata(
    locale,
    dictionary.metaFavoritesTitle,
    dictionary.metaFavoritesDescription,
    "/favorites"
  );
}

export default async function FavoritesPage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const personalization = await getPersonalizationSnapshot();
  const usage = getPersonalizationUsage(personalization);
  const [favorites, recentItems] = await Promise.all([
    getFavoritesPageData(personalization),
    getRecentItemsModule(personalization, { locale }),
  ]);
  const alertItemCount = Object.keys(personalization.alertSettings || {}).length;
  const reminderItems = [
    ...favorites.fixtures.map((fixture) => ({
      itemId: `fixture:${fixture.id}`,
      title: `${fixture.homeTeam?.name || dictionary.match} vs ${fixture.awayTeam?.name || dictionary.match}`,
      subtitle: fixture.league?.name || dictionary.match,
      href: buildMatchHref(locale, fixture),
      supportedTypes: ["KICKOFF", "GOAL", "CARD", "PERIOD_CHANGE", "FINAL_RESULT"],
      surface: "favorites-reminders",
    })),
    ...favorites.teams.map((team) => ({
      itemId: `team:${team.id}`,
      title: team.name,
      subtitle: team.league?.name || dictionary.teams,
      href: buildTeamHref(locale, team),
      supportedTypes: ["KICKOFF", "FINAL_RESULT"],
      surface: "favorites-reminders",
    })),
    ...favorites.competitions.map((competition) => ({
      itemId: `competition:${competition.code}`,
      title: competition.name,
      subtitle: competition.country || dictionary.competition,
      href: buildCompetitionHref(locale, competition),
      supportedTypes: ["KICKOFF", "FINAL_RESULT"],
      surface: "favorites-reminders",
    })),
  ]
    .filter((item) => !(personalization.alertSettings?.[item.itemId] || []).length)
    .slice(0, 4);

  return (
    <section className={styles.section}>
      <PersonalizationUsageTracker
        active={usage.hasFavorites || usage.hasRecentViews}
        surface="favorites-page"
        metadata={usage}
      />

      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{dictionary.favorites}</p>
          <h1 className={styles.pageTitle}>{dictionary.favoritesTitle}</h1>
          <p className={styles.pageLead}>{dictionary.favoritesLead}</p>
        </div>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{usage.favoriteCount}</span>
          <span className={styles.badge}>
            {dictionary.profileAlerts}: {alertItemCount}
          </span>
          <span className={styles.badge}>
            {dictionary.recent}: {usage.recentViewCount}
          </span>
        </div>
      </header>

      {!usage.favoriteCount ? (
        <div className={styles.emptyState}>{dictionary.favoritesEmpty}</div>
      ) : null}

      <RecentItemsPanel dictionary={dictionary} items={recentItems} />
      <FavoriteReminderPanel locale={locale} dictionary={dictionary} items={reminderItems} />

      {favorites.competitions.length ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{dictionary.favoritesCompetitions}</h2>
            <span className={styles.badge}>{favorites.competitions.length}</span>
          </div>

          <div className={styles.leagueGrid}>
            {favorites.competitions.map((competition) => (
              <article key={competition.id} className={styles.leagueCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.eyebrow}>{competition.country || dictionary.international}</p>
                    <h3 className={styles.cardTitle}>
                      <Link href={buildCompetitionHref(locale, competition)}>{competition.name}</Link>
                    </h3>
                  </div>
                  <FavoriteToggle
                    itemId={`competition:${competition.code}`}
                    locale={locale}
                    compact
                    label={competition.name}
                    metadata={{
                      country: competition.country || null,
                    }}
                    surface="favorites-page"
                  />
                </div>

                <div className={styles.inlineBadgeRow}>
                  {competition.seasons[0]?.name ? (
                    <span className={styles.badge}>{competition.seasons[0].name}</span>
                  ) : null}
                  <span className={styles.badge}>
                    {dictionary.teams}: {competition.teams.length}
                  </span>
                  <span className={styles.badge}>
                    {dictionary.fixtures}: {competition.fixtures.length}
                  </span>
                </div>

                <div className={styles.fixtureActionRow}>
                  <AlertSubscriptionControl
                    itemId={`competition:${competition.code}`}
                    locale={locale}
                    supportedTypes={["KICKOFF", "FINAL_RESULT"]}
                    label={competition.name}
                    metadata={{
                      country: competition.country || null,
                    }}
                    surface="favorites-page"
                  />
                  <Link href={buildCompetitionHref(locale, competition)} className={styles.sectionAction}>
                    {dictionary.overview}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {favorites.teams.length ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{dictionary.favoritesTeams}</h2>
            <span className={styles.badge}>{favorites.teams.length}</span>
          </div>

          <div className={styles.teamGrid}>
            {favorites.teams.map((team) => (
              <article key={team.id} className={styles.teamCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>
                      <Link href={buildTeamHref(locale, team)}>{team.name}</Link>
                    </h3>
                    <p className={styles.muted}>
                      {team.league?.name || team.shortName || dictionary.teamProfile}
                    </p>
                  </div>
                  <FavoriteToggle
                    itemId={`team:${team.id}`}
                    locale={locale}
                    compact
                    label={team.name}
                    metadata={{
                      leagueCode: team.league?.code || null,
                    }}
                    surface="favorites-page"
                  />
                </div>

                <div className={styles.inlineBadgeRow}>
                  {team.nextFixture ? <span className={styles.badge}>{dictionary.upcoming}</span> : null}
                  {team.latestFixture ? <span className={styles.badge}>{dictionary.recent}</span> : null}
                </div>

                <div className={styles.fixtureActionRow}>
                  <AlertSubscriptionControl
                    itemId={`team:${team.id}`}
                    locale={locale}
                    supportedTypes={["KICKOFF", "FINAL_RESULT"]}
                    label={team.name}
                    metadata={{
                      leagueCode: team.league?.code || null,
                    }}
                    surface="favorites-page"
                  />
                  <Link href={buildTeamHref(locale, team)} className={styles.sectionAction}>
                    {dictionary.teamProfile}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {favorites.fixtures.length ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{dictionary.favoritesMatches}</h2>
            <span className={styles.badge}>{favorites.fixtures.length}</span>
          </div>

          <div className={styles.fixtureGrid}>
            {favorites.fixtures.map((fixture) => (
              <FixtureCard
                key={fixture.id}
                fixture={fixture}
                locale={locale}
                showAlerts
                alertSupportedTypes={["KICKOFF", "GOAL", "CARD", "PERIOD_CHANGE", "FINAL_RESULT"]}
                surface="favorites-page"
              />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
