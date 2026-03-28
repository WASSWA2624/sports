"use client";

import Image from "next/image";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildAssetUrl } from "../../lib/assets";
import styles from "./scoreboard.module.css";

const MENU_VERTICAL_MARGIN = 12;
const MENU_MIN_HEIGHT = 220;

function getLeagueShortcutStyle(league) {
  return {
    "--league-accent": league.accent || "#9dc6ff",
    "--league-accent-soft": league.accentSoft || "rgba(90, 137, 255, 0.18)",
  };
}

function getOptionLabel(option) {
  if (option.code === "all") {
    return option.name || "All leagues";
  }

  return option.name;
}

function getOptionMeta(option) {
  if (option.code === "all") {
    return "Show every competition in this range";
  }

  const meta = [option.country, `${option.count || 0} matches`].filter(Boolean);
  return meta.join(" \u00b7 ");
}

function LeagueMarkShape({ logoKey }) {
  switch (logoKey) {
    case "premier-league":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M10.4 10.2 8.2 6.8l2.8.5L13 4.5l2 2.8 2.2-2.8 1.6 2.9 3-.6-2.2 3.4 2.6 2.4-3.3.6-.7 4.8H13l-.7-4.8-3.5-.6 2.6-2.4Z" fill="currentColor" />
          <path d="M16 14.1a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2.3a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4Z" fill="currentColor" opacity="0.9" />
        </svg>
      );
    case "champions-league":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="m16 6.2 3.2 2-1 3.7H14l-1-3.7 3-2Z" fill="currentColor" />
          <path d="m8.2 10.2 3.6.7.8 3.7-3 2.1-3-2.2.6-4.3Z" fill="currentColor" opacity="0.94" />
          <path d="m23.8 10.2 1 4.3-3 2.2-3-2.1.8-3.7 3.6-.7Z" fill="currentColor" opacity="0.94" />
          <path d="m11.3 18 3 .9v3.9l-3 2-3-2.2.4-3.6 2.6-1Z" fill="currentColor" opacity="0.88" />
          <path d="m20.7 18 2.6 1 .4 3.6-3 2.2-3-2v-4l3-.8Z" fill="currentColor" opacity="0.88" />
          <circle cx="16" cy="16" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "laliga":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 4.8a11.2 11.2 0 0 1 6.9 2.4l-3.2 2.7a6.5 6.5 0 0 0-3.7-1.1V4.8Z" fill="#ff6e43" />
          <path d="M25 9.2a11.2 11.2 0 0 1 2.1 7.1h-4.3a6.5 6.5 0 0 0-1.2-3.8L25 9.2Z" fill="#ffc341" />
          <path d="M26.9 18.2a11.2 11.2 0 0 1-4.2 6.1l-2.5-3.5a6.5 6.5 0 0 0 2.4-3.4h4.3Z" fill="#19cf81" />
          <path d="M20.9 25.4a11.2 11.2 0 0 1-7.5.7l1.3-4.1a6.5 6.5 0 0 0 4.3-.4l1.9 3.8Z" fill="#2ea4ff" />
          <path d="M11.4 25.6a11.2 11.2 0 0 1-5.7-4.9l3.8-2a6.5 6.5 0 0 0 3 2.6l-1.1 4.3Z" fill="#874dff" />
          <path d="M4.9 18.5a11.2 11.2 0 0 1 1.5-7.3l3.5 2.5a6.5 6.5 0 0 0-.8 4.1L4.9 18.5Z" fill="#ff4776" />
          <circle cx="16" cy="16" r="4.3" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="16" cy="16" r="1.7" fill="currentColor" />
        </svg>
      );
    case "serie-a":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 4.5 24.2 9v10.6L16 27.5 7.8 19.6V9L16 4.5Z" fill="none" stroke="currentColor" strokeWidth="2.3" />
          <path d="M16 8.7 20.2 11l-5.6 12.2h-3L16 8.7Zm1.6 0h3l4.1 14.5h-3.1l-.8-3.2H16l1.6-3h2.4l-1-4.4-1.4-3.9Z" fill="currentColor" />
        </svg>
      );
    case "bundesliga":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <rect x="7" y="5.5" width="18" height="21" rx="4" fill="currentColor" opacity="0.18" />
          <path d="M17.2 8.6c1 0 1.8.8 1.8 1.8s-.8 1.8-1.8 1.8-1.8-.8-1.8-1.8.8-1.8 1.8-1.8Z" fill="currentColor" />
          <path d="m15.3 13.1 3.8 1.6 3.6-2.4 1.3 2-3.9 2.5 2 3.5-2.3 1.3-2-3.6-3.6.9-.6 4h-2.5l.8-5.4 3.3-.8-1.5-2.5 1.6-1.1Z" fill="currentColor" />
        </svg>
      );
    case "mls":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M9 5.8h14l-1 15.4L16 26.2l-6-5 1-15.4Z" fill="none" stroke="currentColor" strokeWidth="2.1" />
          <path d="M11 10.5h10.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="m11 21.2 10.4-10" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          <circle cx="13.1" cy="14.1" r="1.1" fill="currentColor" />
          <circle cx="15.8" cy="11.8" r="1.1" fill="currentColor" />
          <circle cx="18.6" cy="9.4" r="1.1" fill="currentColor" />
        </svg>
      );
    case "ligue-1":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="m16 5.2 7.8 4.5v9L16 26.8l-7.8-8.1v-9L16 5.2Z" fill="none" stroke="currentColor" strokeWidth="2.1" />
          <path d="M12 12.2h3v7.6h-3zm5 0h3v7.6h-3zM15 15h2v2h-2z" fill="currentColor" />
        </svg>
      );
    case "ligi-kuu-bara":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="10.2" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M9.2 18.3c2.3-2.6 4.3-3.8 6.2-3.8 2.1 0 3.7.8 7.4 4.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M11 12.2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="16" r="1.6" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16 9v14M9 16h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

function LeagueMark({ option, compact = false }) {
  const logoSrc = typeof option?.logoUrl === "string" && option.logoUrl.trim()
    ? buildAssetUrl(option.logoUrl, { type: "competition-logo", width: 64 })
    : null;

  return (
    <span
      className={compact ? styles.leagueSelectLogoCompact : styles.leagueSelectLogo}
      style={getLeagueShortcutStyle(option)}
      aria-hidden="true"
    >
      {logoSrc ? (
        <Image
          src={logoSrc}
          alt=""
          width={48}
          height={48}
          className={styles.leagueSelectLogoImage}
          unoptimized
        />
      ) : (
        <LeagueMarkShape logoKey={option.logoKey} />
      )}
    </span>
  );
}

export function LeagueFilterDropdown({
  locale,
  currentFilters,
  options = [],
  selectedLeague = "all",
  compactMobile = false,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [menuMaxHeight, setMenuMaxHeight] = useState(320);
  const [menuWidth, setMenuWidth] = useState(null);
  const [menuOffsetLeft, setMenuOffsetLeft] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);
  const menuId = useId();

  const selectedOption =
    options.find((option) => option.code === selectedLeague) ||
    options.find((option) => option.code === "all") ||
    { code: "all", name: "All leagues" };
  const normalizedSearch = searchValue.trim().toLowerCase();
  const visibleOptions = normalizedSearch
    ? options.filter((option) => {
        const haystack = [option.name, option.country, option.code]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : options;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      return undefined;
    }

    function updateMenuPlacement() {
      if (!buttonRef.current) {
        return;
      }

      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - MENU_VERTICAL_MARGIN;
      const spaceAbove = rect.top - MENU_VERTICAL_MARGIN;
      const shouldOpenUpward = spaceBelow < MENU_MIN_HEIGHT && spaceAbove > spaceBelow;
      const availableHeight = Math.max(
        160,
        (shouldOpenUpward ? spaceAbove : spaceBelow) - MENU_VERTICAL_MARGIN
      );
      const viewportWidth = window.innerWidth;
      const maxViewportWidth = Math.max(0, viewportWidth - MENU_VERTICAL_MARGIN * 2);
      const measuredOptionWidth = optionRefs.current.reduce((largest, element) => {
        if (!element) {
          return largest;
        }

        return Math.max(largest, element.scrollWidth);
      }, 0);
      const measuredHeaderWidth = menuRef.current?.querySelector(`.${styles.leagueSelectMenuHeader}`)?.scrollWidth || 0;
      const desiredWidth = Math.max(rect.width, measuredOptionWidth + 24, measuredHeaderWidth + 16);
      const minimumUsableWidth = Math.min(maxViewportWidth, Math.max(rect.width, 180));
      const nextMenuWidth = Math.max(minimumUsableWidth, Math.min(maxViewportWidth, desiredWidth));
      const overflowRight = rect.left + nextMenuWidth + MENU_VERTICAL_MARGIN - viewportWidth;
      const overflowLeft = rect.left - MENU_VERTICAL_MARGIN;
      let nextOffsetLeft = 0;

      if (overflowRight > 0) {
        nextOffsetLeft = -overflowRight;
      } else if (overflowLeft < 0) {
        nextOffsetLeft = Math.abs(overflowLeft);
      }

      setOpenUpward(shouldOpenUpward);
      setMenuMaxHeight(availableHeight);
      setMenuWidth(nextMenuWidth);
      setMenuOffsetLeft(nextOffsetLeft);
    }

    updateMenuPlacement();
    window.addEventListener("resize", updateMenuPlacement);
    window.addEventListener("scroll", updateMenuPlacement, true);

    return () => {
      window.removeEventListener("resize", updateMenuPlacement);
      window.removeEventListener("scroll", updateMenuPlacement, true);
    };
  }, [open]);

  function handleSelect(nextCode) {
    const params = new URLSearchParams(searchParams.toString());

    if (!nextCode || nextCode === "all") {
      params.delete("league");
    } else {
      params.set("league", nextCode);
    }

    const queryString = params.toString();
    const nextPath = pathname || `/${locale}`;

    router.push(queryString ? `${nextPath}?${queryString}` : nextPath);
    setOpen(false);
  }

  return (
    <div className={styles.leagueSelectWrap} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={compactMobile ? styles.leagueSelectTriggerCompactMobile : styles.leagueSelectTrigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          setSearchValue("");
          setOpen((current) => !current);
        }}
      >
        <span className={styles.leagueSelectTriggerMain}>
          <LeagueMark option={selectedOption} compact />
          <span className={styles.leagueSelectTriggerCopy}>
            <span className={styles.leagueSelectTriggerLabel}>League</span>
            <span className={styles.leagueSelectTriggerSummary}>
              <strong>{getOptionLabel(selectedOption)}</strong>
              <span className={styles.leagueSelectTriggerMeta}>
                {selectedOption.code === "all"
                  ? `${currentFilters.totalMatches} matches`
                  : `${selectedOption.count || 0} matches`}
              </span>
            </span>
          </span>
        </span>
        <span className={open ? styles.leagueSelectChevronOpen : styles.leagueSelectChevron} aria-hidden="true">
          <svg viewBox="0 0 16 16">
            <path
              d="m3.5 6 4.5 4 4.5-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          className={openUpward ? styles.leagueSelectMenuUpward : styles.leagueSelectMenu}
          style={{
            maxHeight: `${menuMaxHeight}px`,
            width: menuWidth ? `${menuWidth}px` : undefined,
            left: `${menuOffsetLeft}px`,
          }}
        >
          <div className={styles.leagueSelectMenuHeader}>
            <strong>Choose competition</strong>
            <span>{visibleOptions.length} options</span>
          </div>

          <label className={styles.leagueSelectSearch}>
            <span className={styles.srOnly}>Search leagues</span>
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.currentTarget.value)}
              className={styles.leagueSelectSearchInput}
              placeholder="Search leagues"
              autoComplete="off"
            />
          </label>

          <div className={styles.leagueSelectList} style={{ maxHeight: `${Math.max(120, menuMaxHeight - 118)}px` }}>
            {visibleOptions.length ? visibleOptions.map((option, index) => {
              const active = option.code === selectedOption.code;
              const className = active ? styles.leagueSelectOptionActive : styles.leagueSelectOption;

              return (
                <button
                  key={option.code}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  className={className}
                  onClick={() => handleSelect(option.code)}
                >
                  <span className={styles.leagueSelectOptionLead}>
                    <LeagueMark option={option} />
                    <span className={styles.leagueSelectOptionCopy}>
                      <strong>{getOptionLabel(option)}</strong>
                      <span>{getOptionMeta(option)}</span>
                    </span>
                  </span>
                  <span className={styles.leagueSelectOptionTrail}>
                    {active ? "Selected" : option.code === "all" ? "Show all" : option.count || 0}
                  </span>
                </button>
              );
            }) : (
              <div className={styles.leagueSelectEmpty}>No leagues match that search.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
