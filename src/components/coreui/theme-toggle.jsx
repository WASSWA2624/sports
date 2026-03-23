"use client";

import { usePreferences } from "./preferences-provider";
import { ShellIcon } from "./shell-icons";
import styles from "./styles.module.css";

const options = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Auto" },
];

export function ThemeToggle({ label }) {
  const { theme, setTheme } = usePreferences();

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
