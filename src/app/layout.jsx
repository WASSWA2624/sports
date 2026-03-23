import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import {
  DEFAULT_LOCALE,
  THEME_COOKIE_NAME,
} from "../lib/coreui/preferences";
import { getPreferredLocale } from "../lib/coreui/preferences-server";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "Sports Pulse",
    template: "%s | Sports Pulse",
  },
  description: "SEO-first sports coverage for live scores, fixtures, results, tables, leagues, and teams.",
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
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
