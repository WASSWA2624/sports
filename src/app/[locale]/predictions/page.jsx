import { PlatformFoundationPage } from "../../../components/coreui/platform-foundation-page";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { getViewerGeo } from "../../../lib/platform/request-context";
import { getPlatformPublicSnapshotData } from "../../../lib/platform/env";

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
  const [viewerGeo, platform] = await Promise.all([
    getViewerGeo(),
    getPlatformPublicSnapshotData(),
  ]);
  const geoLabel = platform.geoLabels?.[viewerGeo] || viewerGeo;
  const primaryPartner =
    platform.affiliate.partnerByGeo?.[viewerGeo]?.[0] ||
    platform.affiliate.primaryPartner ||
    dictionary.noData;

  return (
    <PlatformFoundationPage
      eyebrow={dictionary.predictionsEyebrow}
      title={dictionary.predictionsTitle}
      lead={dictionary.predictionsLead}
      sections={[
        {
          title: dictionary.predictionsCoverageTitle,
          body: `${dictionary.currentMarket}: ${geoLabel}. ${dictionary.affiliatePartnerLabel}: ${primaryPartner}.`,
          badge: geoLabel,
          pills: platform.launchGeos.map((geo) => platform.geoLabels?.[geo] || geo),
        },
        {
          title: dictionary.predictionsProviderTitle,
          body: platform.search.predictionsProviderKey
            ? `${dictionary.predictionsProviderReady} ${platform.search.predictionsProviderKey}.`
            : dictionary.predictionsProviderPending,
          badge: platform.search.predictionsProviderKey ? dictionary.coverageReady : dictionary.coverageWaiting,
        },
        {
          title: dictionary.predictionsSurfaceTitle,
          body: dictionary.predictionsSurfaceBody,
          href: `/${locale}/leagues`,
          actionLabel: dictionary.openLeagueDirectory,
        },
      ]}
    />
  );
}
