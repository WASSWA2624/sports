"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LOCALE_COOKIE_NAME, SUPPORTED_LOCALES } from "../../lib/coreui/preferences";
import styles from "./public-shell.module.css";

function getSelectedStatus(searchParams) {
  return String(searchParams?.get("status") || "all").trim().toLowerCase();
}

const THEME_STORAGE_KEY = "sports_theme";
const THEME_COOKIE_NAME = "sports_theme";
const LOCALE_OPTIONS = {
  en: { label: "English" },
  fr: { label: "Français" },
  sw: { label: "Kiswahili" },
};

function ThemeIcon({ theme }) {
  const commonProps = {
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (theme === "light") {
    return (
      <svg {...commonProps}>
        <circle cx="8" cy="8" r="2.75" />
        <path d="M8 1.75v1.5M8 12.75v1.5M3.58 3.58l1.06 1.06M11.36 11.36l1.06 1.06M1.75 8h1.5M12.75 8h1.5M3.58 12.42l1.06-1.06M11.36 4.64l1.06-1.06" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M10.75 2.25a5.75 5.75 0 1 0 3 10.66A6.5 6.5 0 0 1 10.75 2.25Z" />
    </svg>
  );
}

function buildLocaleHref(pathname, searchParams, targetLocale) {
  const segments = String(pathname || "").split("/").filter(Boolean);

  if (segments.length) {
    segments[0] = targetLocale;
  } else {
    segments.push(targetLocale);
  }

  const query = searchParams?.toString();
  return `/${segments.join("/")}${query ? `?${query}` : ""}`;
}

function LocaleFlag({ locale }) {
  if (locale === "en") {
    return (
      <svg viewBox="0 0 20 14" aria-hidden="true">
        <rect width="20" height="14" rx="2" fill="#1F4AA8" />
        <path d="M0 1.5V0h2.1L20 10.5V14h-2.1L0 3.5V1.5Z" fill="#fff" />
        <path d="M17.9 0H20v1.5L2.1 14H0v-1.5L17.9 0Z" fill="#fff" />
        <path d="M0 2.3V0h1.2L20 11.7V14h-1.2L0 2.3Z" fill="#D92D2D" />
        <path d="M18.8 0H20v2.3L1.2 14H0v-2.3L18.8 0Z" fill="#D92D2D" />
        <path d="M8 0h4v14H8Z" fill="#fff" />
        <path d="M0 5h20v4H0Z" fill="#fff" />
        <path d="M8.8 0h2.4v14H8.8Z" fill="#D92D2D" />
        <path d="M0 5.8h20v2.4H0Z" fill="#D92D2D" />
      </svg>
    );
  }

  if (locale === "fr") {
    return (
      <svg viewBox="0 0 20 14" aria-hidden="true">
        <rect width="20" height="14" rx="2" fill="#fff" />
        <path d="M0 0h6.67v14H0Z" fill="#1F4AA8" />
        <path d="M13.33 0H20v14h-6.67Z" fill="#D92D2D" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 14" aria-hidden="true">
      <rect width="20" height="14" rx="2" fill="#1D1D1D" />
      <path d="M0 0h20v4.67H0Z" fill="#3BAA3B" />
      <path d="M0 9.33h20V14H0Z" fill="#3BAA3B" />
      <path d="M0 4.67h20v4.66H0Z" fill="#111" />
      <path d="M8.5 0h3L20 14h-3Z" fill="#F6D34E" />
      <path d="M9.15 0h1.7L19.35 14h-1.7Z" fill="#58A9FF" />
    </svg>
  );
}

function NavIcon({ name }) {
  const commonProps = {
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (name === "matches") {
    return (
      <svg {...commonProps}>
        <circle cx="8" cy="8" r="5.25" />
        <path d="M8 2.75v10.5M2.75 8h10.5" />
      </svg>
    );
  }

  if (name === "live") {
    return (
      <svg {...commonProps}>
        <path d="M3 8a5 5 0 0 1 10 0" />
        <path d="M5 8a3 3 0 0 1 6 0" />
        <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (name === "upcoming") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="4" width="10" height="9" rx="1.8" />
        <path d="M5.5 2.75v2.1M10.5 2.75v2.1M3 6.5h10" />
      </svg>
    );
  }

  if (name === "results") {
    return (
      <svg {...commonProps}>
        <path d="M4 8.5 6.5 11 12 5.5" />
        <circle cx="8" cy="8" r="5.25" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M3.5 5.5 8 3l4.5 2.5L8 8 3.5 5.5Z" />
      <path d="M3.5 10.5 8 8l4.5 2.5L8 13l-4.5-2.5Z" />
    </svg>
  );
}

function buildShellNav(locale) {
  return [
    {
      key: "matches",
      label: "All",
      href: `/${locale}`,
      isActive(pathname, searchParams) {
        return pathname === `/${locale}` && !["live", "scheduled", "finished"].includes(getSelectedStatus(searchParams));
      },
    },
    {
      key: "live",
      label: "Live",
      href: `/${locale}?status=live`,
      isActive(pathname, searchParams) {
        return pathname === `/${locale}` && String(searchParams?.get("status") || "").toLowerCase() === "live";
      },
    },
    {
      key: "upcoming",
      label: "Fixtures",
      href: `/${locale}?status=scheduled`,
      isActive(pathname, searchParams) {
        return pathname === `/${locale}` && String(searchParams?.get("status") || "").toLowerCase() === "scheduled";
      },
    },
    {
      key: "results",
      label: "Results",
      href: `/${locale}?status=finished`,
      isActive(pathname, searchParams) {
        return pathname === `/${locale}` && String(searchParams?.get("status") || "").toLowerCase() === "finished";
      },
    },
    {
      key: "leagues",
      label: "Leagues",
      href: `/${locale}/leagues`,
      isActive(pathname) {
        return pathname === `/${locale}/leagues` || pathname.startsWith(`/${locale}/leagues/`);
      },
    },
  ];
}

function ShellFrame({ children, locale, dictionary, pathname = "", searchParams = null }) {
  const navItems = buildShellNav(locale);
  const router = useRouter();
  const currentLocaleOption = LOCALE_OPTIONS[locale] || { label: locale.toUpperCase() };
  const [theme, setTheme] = useState(() => {
    if (typeof document === "undefined") {
      return "dark";
    }

    return (
      window.localStorage.getItem(THEME_STORAGE_KEY) ||
      document.documentElement.getAttribute("data-theme-preference") ||
      document.documentElement.getAttribute("data-theme") ||
      "dark"
    );
  });
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-theme-preference", theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  }, [theme]);

  useEffect(() => {
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  }, [locale]);

  function handleThemeToggle() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
  }

  function handleLocaleChange(nextLocale) {
    const nextHref = buildLocaleHref(pathname, searchParams, nextLocale);
    router.push(nextHref);
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerTop}>
            <Link href={`/${locale}`} className={styles.brandLink}>
              <span className={styles.brandMark} aria-hidden="true">
                RS
              </span>
              <span className={styles.brandBlock}>
                <strong className={styles.brandTitle}>{dictionary.brand}</strong>
                <span className={styles.brandTag}>{dictionary.brandTag || "Live match center"}</span>
              </span>
            </Link>

            <div className={styles.headerUtility}>
              <button
                type="button"
                className={styles.headerUtilityButton}
                onClick={handleThemeToggle}
                aria-label={`${dictionary.theme}: ${theme === "light" ? dictionary.themeLight : dictionary.themeDark}`}
                title={`${dictionary.theme}: ${theme === "light" ? dictionary.themeLight : dictionary.themeDark}`}
              >
                <span className={styles.headerUtilityIcon} aria-hidden="true">
                  <ThemeIcon theme={theme} />
                </span>
                <span>{theme === "light" ? dictionary.themeLight : dictionary.themeDark}</span>
              </button>

              <details className={styles.localePicker}>
                <summary className={styles.localeToggle} aria-label={dictionary.locale}>
                  <span className={styles.localeLabel}>{dictionary.locale}</span>
                  <span className={styles.localeValue}>
                    <span className={styles.localeFlag} aria-hidden="true">
                      <LocaleFlag locale={locale} />
                    </span>
                    <span className={styles.localeText}>{currentLocaleOption.label}</span>
                  </span>
                </summary>

                <div className={styles.localeMenu} role="listbox" aria-label={dictionary.locale}>
                  {SUPPORTED_LOCALES.map((entry) => {
                    const option = LOCALE_OPTIONS[entry] || { label: entry.toUpperCase() };
                    return (
                      <button
                        key={entry}
                        type="button"
                        className={entry === locale ? styles.localeOptionActive : styles.localeOption}
                        onClick={() => handleLocaleChange(entry)}
                        role="option"
                        aria-selected={entry === locale}
                      >
                        <span className={styles.localeFlag} aria-hidden="true">
                          <LocaleFlag locale={entry} />
                        </span>
                        <span className={styles.localeText}>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </details>
            </div>
          </div>

          <nav className={styles.nav} aria-label="Primary">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={item.isActive(pathname, searchParams) ? styles.navLinkActive : styles.navLink}
              >
                <span className={styles.navIcon} aria-hidden="true">
                  <NavIcon name={item.key} />
                </span>
                <span className={styles.navText}>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className={styles.content}>{children}</main>
    </div>
  );
}

function HookedShellFrame(props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return <ShellFrame {...props} pathname={pathname} searchParams={searchParams} />;
}

export function PublicShell(props) {
  return (
    <Suspense fallback={<ShellFrame {...props} />}>
      <HookedShellFrame {...props} />
    </Suspense>
  );
}
