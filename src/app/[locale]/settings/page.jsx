import { PlatformFoundationPage } from "../../../components/coreui/platform-foundation-page";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import {
  appendRouteContext,
  getGeoLabel,
} from "../../../lib/coreui/route-context";
import { getViewerGeo } from "../../../lib/platform/request-context";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return buildPageMetadata(
    locale,
    dictionary.metaSettingsTitle,
    dictionary.metaSettingsDescription,
    "/settings"
  );
}

export default async function SettingsPage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const viewerGeo = await getViewerGeo();

  return (
    <PlatformFoundationPage
      eyebrow={dictionary.settingsEyebrow}
      title={dictionary.settingsTitle}
      lead={dictionary.settingsLead}
      sections={[
        {
          title: dictionary.settingsProfileTitle,
          body: dictionary.settingsProfileBody,
          href: "/profile",
          actionLabel: dictionary.openProfileSettings,
        },
        {
          title: dictionary.settingsMarketTitle,
          body: `${dictionary.currentMarket}: ${getGeoLabel(viewerGeo)}.`,
          badge: getGeoLabel(viewerGeo),
          pills: ["UG", "KE", "NG"].map((geo) => getGeoLabel(geo)),
          href: appendRouteContext(`/${locale}/settings`, { geo: viewerGeo }),
          actionLabel: dictionary.settingsMarketAction,
        },
        {
          title: dictionary.settingsFunnelTitle,
          body: dictionary.settingsFunnelBody,
          href: `/${locale}/funnels`,
          actionLabel: dictionary.openFunnelsWorkspace,
        },
      ]}
    />
  );
}
