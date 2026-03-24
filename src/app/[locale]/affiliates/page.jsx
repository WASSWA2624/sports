import { PlatformFoundationPage } from "../../../components/coreui/platform-foundation-page";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { getViewerGeo } from "../../../lib/platform/request-context";
import { getPlatformPublicSnapshot } from "../../../lib/platform/env";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return buildPageMetadata(
    locale,
    dictionary.metaAffiliatesTitle,
    dictionary.metaAffiliatesDescription,
    "/affiliates"
  );
}

export default async function AffiliatesPage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const [viewerGeo, platform] = await Promise.all([
    getViewerGeo(),
    Promise.resolve(getPlatformPublicSnapshot()),
  ]);
  const geoLabel = platform.geoLabels?.[viewerGeo] || viewerGeo;
  const geoPartners = platform.affiliate.partnerByGeo?.[viewerGeo] || [];
  const bookmakers = platform.affiliate.bookmakerByGeo?.[viewerGeo] || [];

  return (
    <PlatformFoundationPage
      eyebrow={dictionary.affiliatesEyebrow}
      title={dictionary.affiliatesTitle}
      lead={dictionary.affiliatesLead}
      sections={[
        {
          title: dictionary.affiliatesPartnerTitle,
          body: geoPartners.length
            ? `${dictionary.currentMarket}: ${geoLabel}. ${dictionary.affiliatePartnerLabel}: ${geoPartners.join(", ")}.`
            : dictionary.affiliatesPartnerPending,
          badge: geoLabel,
          pills: platform.affiliate.partnerCodes,
        },
        {
          title: dictionary.affiliatesBookmakerTitle,
          body: bookmakers.length
            ? `${dictionary.affiliatesBookmakerReady} ${bookmakers.join(", ")}.`
            : dictionary.affiliatesBookmakerPending,
          pills: bookmakers,
        },
        {
          title: dictionary.affiliatesOpsTitle,
          body: dictionary.affiliatesOpsBody,
          href: `/${locale}/admin`,
          actionLabel: dictionary.openAdminControlRoom,
        },
      ]}
    />
  );
}
