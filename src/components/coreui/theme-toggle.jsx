"use client";

import { getDictionary } from "../../lib/coreui/dictionaries";
import { usePreferences } from "./preferences-provider";
import { ShellIcon } from "./shell-icons";
import styles from "./styles.module.css";

export function ThemeToggle({ label, locale = "en" }) {
  const { theme, setTheme } = usePreferences();
  const dictionary = getDictionary(locale);
  const options = [
    { value: "light", label: dictionary.themeLight },
    { value: "dark", label: dictionary.themeDark },
    { value: "system", label: dictionary.themeSystem },
  ];

  return (
    <div className={`${styles.preferenceBlock} ${styles.headerPreferenceBlock}`} role="group" aria-label={label}>
      <span className={styles.preferenceIcon}>
        <ShellIcon name="theme" className={styles.controlIcon} />
      </span>
      <span className={styles.srOnly}>{label}</span>
      <div className={styles.segmentedControl}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={theme === option.value ? styles.segmentActive : styles.segment}
            onClick={() => setTheme(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
