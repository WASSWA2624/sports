import { Barlow_Condensed, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import {
  DEFAULT_LOCALE,
  DEFAULT_THEME,
} from "../lib/coreui/preferences";
import { getDictionary } from "../lib/coreui/dictionaries";
import {
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
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
      shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }) {
  const locale = await getPreferredLocale().catch(() => DEFAULT_LOCALE);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${bodyFont.variable} ${monoFont.variable} ${displayFont.variable}`}
      data-theme={DEFAULT_THEME}
      data-theme-preference={DEFAULT_THEME}
    >
      <body>{children}</body>
    </html>
  );
}
