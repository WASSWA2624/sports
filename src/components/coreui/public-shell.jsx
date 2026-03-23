"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { PreferencesProvider, usePreferences } from "./preferences-provider";
import styles from "./styles.module.css";
import { PUBLIC_NAV } from "../../lib/coreui/config";

function ShellFrame({ children, locale, dictionary, watchlistItems }) {
  const pathname = usePathname();
  const { watchlistCount } = usePreferences();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandBlock}>
            <Link href={`/${locale}`} className={styles.brand}>
              {dictionary.brand}
            </Link>
            <p className={styles.brandTag}>SEO-first matchday navigation for public sports coverage.</p>
          </div>
          <nav className={styles.nav}>
            {PUBLIC_NAV.map((item) => {
              const href = `/${locale}${item.href}`;
              const active =
                item.href === ""
                  ? pathname === `/${locale}`
                  : pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link key={item.key} href={href} className={active ? styles.navLinkActive : styles.navLink}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className={styles.headerControls}>
            <LocaleSwitcher locale={locale} label={dictionary.locale} />
            <ThemeToggle label={dictionary.theme} />
            <div className={styles.watchPill}>
              {dictionary.watchlist}: {watchlistCount || watchlistItems.length}
            </div>
          </div>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p>Public sitemap: home, live, fixtures, results, tables, leagues, teams, and match detail.</p>
          <p>Preference cookies keep locale, theme, and watchlist choices across visits.</p>
        </div>
      </footer>
    </div>
  );
}

export function PublicShell({
  children,
  locale,
  dictionary,
  initialTheme,
  initialWatchlist,
}) {
  return (
    <PreferencesProvider
      initialLocale={locale}
      initialTheme={initialTheme}
      initialWatchlist={initialWatchlist}
    >
      <ShellFrame locale={locale} dictionary={dictionary} watchlistItems={initialWatchlist}>
        {children}
      </ShellFrame>
    </PreferencesProvider>
  );
}
