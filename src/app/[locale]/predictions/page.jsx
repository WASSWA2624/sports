import { CommunitySlipHub } from "../../../components/coreui/community-slip-hub";
import sharedStyles from "../../../components/coreui/styles.module.css";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { getViewerGeo } from "../../../lib/platform/request-context";
import { getCurrentUserFromServer } from "../../../lib/auth";
import { getCommunitySlipHubData } from "../../../lib/community-slips";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return buildPageMetadata(
    locale,
    dictionary.metaPredictionsTitle,
    dictionary.metaPredictionsDescription,
    "/predictions"
  );
}

export default async function PredictionsPage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const [viewerGeo, userContext] = await Promise.all([
    getViewerGeo(),
    getCurrentUserFromServer(),
  ]);
  const hubData = await getCommunitySlipHubData({
    locale,
    viewerTerritory: viewerGeo,
    currentUserId: userContext?.user?.id || null,
    includeComposerCatalog: true,
    catalogFixtureLimit: 16,
  });

  return (
    <section className={sharedStyles.section}>
      <CommunitySlipHub
        locale={locale}
        dictionary={dictionary}
        surface="predictions-page"
        entityType="predictions"
        entityId={locale}
        viewerTerritory={viewerGeo}
        initialData={hubData}
        authHref={`/${locale}/auth`}
        predictionsHref={`/${locale}/predictions`}
        allowComposer
        catalogLimit={16}
      />
    </section>
  );
}
