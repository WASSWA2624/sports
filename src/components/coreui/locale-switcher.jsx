"use client";

import { useRouter, usePathname } from "next/navigation";
import { LOCALE_LABELS } from "../../lib/coreui/config";
import { LOCALE_COOKIE_NAME, SUPPORTED_LOCALES } from "../../lib/coreui/preferences";
import { ShellIcon } from "./shell-icons";
import styles from "./styles.module.css";

export function LocaleSwitcher({ locale, label }) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(event) {
    const nextLocale = event.target.value;
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length > 0 && SUPPORTED_LOCALES.includes(segments[0])) {
      segments[0] = nextLocale;
    } else {
      segments.unshift(nextLocale);
    }

    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.replace(`/${segments.join("/")}`);
  }

  return (
    <label className={`${styles.inlineControl} ${styles.headerSelect}`}>
      <span className={styles.selectAdornment}>
        <ShellIcon name="locale" className={styles.controlIcon} />
      </span>
      <span className={styles.srOnly}>{label}</span>
      <select
        aria-label={label}
        className={styles.selectControl}
        value={locale}
        onChange={handleChange}
      >
        {SUPPORTED_LOCALES.map((item) => (
          <option key={item} value={item}>
            {LOCALE_LABELS[item]}
          </option>
        ))}
      </select>
      <span className={styles.selectChevron}>
        <ShellIcon name="chevron-down" className={styles.chevronIcon} />
      </span>
    </label>
  );
}
