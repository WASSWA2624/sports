import { Barlow_Condensed, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { StoreProvider } from "../components/coreui/store-provider";
import StyledComponentsRegistry from "../lib/styled-components/registry";
import {
  DEFAULT_LOCALE,
  THEME_COOKIE_NAME,
} from "../lib/coreui/preferences";
import { getPreferredLocale } from "../lib/coreui/preferences-server";

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

export const metadata = {
  title: {
    default: "Sports Pulse",
    template: "%s | Sports Pulse",
  },
  description: "SEO-first sports coverage for live scores, fixtures, results, tables, leagues, and teams.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeInitScript = `
  (function () {
    var match = document.cookie.match(/(?:^|; )${THEME_COOKIE_NAME}=([^;]*)/);
    var savedTheme = match ? decodeURIComponent(match[1]) : null;
    var localTheme = null;
    try {
      localTheme = window.localStorage.getItem("${THEME_COOKIE_NAME}");
    } catch (error) {}
    var theme = savedTheme || localTheme || "system";
    var resolvedTheme = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themePreference = theme;
  })();
`;

export default async function RootLayout({ children }) {
  const locale = await getPreferredLocale().catch(() => DEFAULT_LOCALE);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${bodyFont.variable} ${monoFont.variable} ${displayFont.variable}`}
    >
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <StyledComponentsRegistry>
          <StoreProvider>{children}</StoreProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
