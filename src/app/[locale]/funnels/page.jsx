import { PlatformFoundationPage } from "../../../components/coreui/platform-foundation-page";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { getViewerGeo } from "../../../lib/platform/request-context";
import { getPlatformPublicSnapshot } from "../../../lib/platform/env";
import { isGeoAllowed } from "../../../lib/coreui/route-context";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return buildPageMetadata(
    locale,
    dictionary.metaFunnelsTitle,
    dictionary.metaFunnelsDescription,
    "/funnels"
  );
}

export default async function FunnelsPage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const [viewerGeo, platform] = await Promise.all([
    getViewerGeo(),
    Promise.resolve(getPlatformPublicSnapshot()),
  ]);
  const geoLabel = platform.geoLabels?.[viewerGeo] || viewerGeo;
  const actions = platform.funnel.actions.filter((action) =>
    isGeoAllowed(viewerGeo, action.enabledGeos)
  );

  return (
    <PlatformFoundationPage
      eyebrow={dictionary.funnelsEyebrow}
      title={dictionary.funnelsTitle}
      lead={dictionary.funnelsLead}
      sections={[
        {
          title: dictionary.funnelsRoutingTitle,
          body: `${dictionary.currentMarket}: ${geoLabel}.`,
          badge: geoLabel,
          pills: platform.launchGeos.map((geo) => platform.geoLabels?.[geo] || geo),
        },
        ...(actions.length
          ? actions.map((action) => ({
              title:
                action.key === "telegram"
                  ? dictionary.funnelsTelegramTitle
                  : dictionary.funnelsWhatsAppTitle,
              body:
                action.key === "telegram"
                  ? dictionary.funnelsTelegramBody
                  : dictionary.funnelsWhatsAppBody,
              href: action.url,
              actionLabel:
                action.key === "telegram"
                  ? dictionary.openTelegram
                  : dictionary.openWhatsApp,
            }))
          : [
              {
                title: dictionary.funnelsUnavailableTitle,
                body: dictionary.funnelUnavailable,
              },
            ]),
      ]}
    />
  );
}
