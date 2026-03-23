"use client";

import { useEffect } from "react";
import Link from "next/link";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { closeSearch, openSearch } from "../../lib/store";
import { ShellIcon } from "./shell-icons";
import styles from "./styles.module.css";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: start center;
  padding: 5rem 1rem 1rem;
  background: var(--overlay-backdrop);
  backdrop-filter: blur(10px);
`;

const Panel = styled.div`
  width: min(42rem, calc(100vw - 2rem));
  border: 1px solid var(--overlay-panel-border);
  border-radius: 0.7rem;
  background: var(--overlay-panel);
  box-shadow: var(--shadow-soft);
  color: var(--overlay-panel-text);
  overflow: hidden;
`;

const SearchField = styled.input`
  width: 100%;
  padding: 1rem;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  color: inherit;
  font: inherit;
  letter-spacing: 0.04em;
  outline: none;

  &::placeholder {
    color: var(--overlay-placeholder);
  }
`;

export function ShellSearch({ dictionary, locale, shortcuts }) {
  const dispatch = useDispatch();
  const searchOpen = useSelector((state) => state.shell.searchOpen);

  useEffect(() => {
    if (!searchOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        dispatch(closeSearch());
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, searchOpen]);

  return (
    <>
      <button
        type="button"
        aria-label={dictionary.search}
        className={`${styles.sectionAction} ${styles.headerAction}`}
        onClick={() => dispatch(openSearch())}
      >
        <ShellIcon name="search" className={styles.controlIcon} />
        <span className={styles.headerActionLabel}>{dictionary.search}</span>
      </button>

      {searchOpen ? (
        <Overlay onClick={() => dispatch(closeSearch())}>
          <Panel onClick={(event) => event.stopPropagation()}>
            <SearchField
              type="search"
              placeholder={dictionary.searchPlaceholder}
              aria-label={dictionary.search}
            />

            <div className={styles.searchOverlayBody}>
              <p className={styles.railMuted}>{dictionary.searchHelp}</p>
              <div className={styles.railList}>
                {shortcuts.map((shortcut) => (
                  <Link
                    key={`${shortcut.type}:${shortcut.href}`}
                    href={`/${locale}${shortcut.href}`}
                    className={styles.railLink}
                    onClick={() => dispatch(closeSearch())}
                  >
                    {shortcut.label}
                  </Link>
                ))}
              </div>
            </div>
          </Panel>
        </Overlay>
      ) : null}
    </>
  );
}
