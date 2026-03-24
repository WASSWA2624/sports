import { Barlow_Condensed, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "../components/coreui/store-provider";
import StyledComponentsRegistry from "../lib/styled-components/registry";
import {
  DEFAULT_LOCALE,
  DEFAULT_THEME,
} from "../lib/coreui/preferences";
import { getDictionary } from "../lib/coreui/dictionaries";
import {
  getPreferenceSnapshot,
  getPreferredLocale,
} from "../lib/coreui/preferences-server";
import { getSiteOrigin } from "../lib/coreui/site";

const bodyFont = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const displayFont = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export async function generateMetadata() {
  const locale = await getPreferredLocale().catch(() => DEFAULT_LOCALE);
  const dictionary = getDictionary(locale);

  return {
    metadataBase: new URL(getSiteOrigin()),
    title: {
      default: dictionary.brand,
      template: `%s | ${dictionary.brand}`,
    },
    description: dictionary.heroBody,
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }) {
  const preferences = await getPreferenceSnapshot().catch(() => ({
    locale: DEFAULT_LOCALE,
    theme: DEFAULT_THEME,
  }));

  return (
    <html
      lang={preferences.locale}
      suppressHydrationWarning
      className={`${bodyFont.variable} ${monoFont.variable} ${displayFont.variable}`}
      data-theme={preferences.theme}
      data-theme-preference={preferences.theme}
    >
      <body>
        <StyledComponentsRegistry>
          <StoreProvider>{children}</StoreProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
