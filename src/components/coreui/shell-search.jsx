"use client";

import { useEffect } from "react";
import Link from "next/link";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { closeSearch, openSearch } from "../../lib/store";
import styles from "./styles.module.css";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: start center;
  padding: 5rem 1rem 1rem;
  background: rgba(2, 10, 13, 0.72);
  backdrop-filter: blur(10px);
`;

const Panel = styled.div`
  width: min(42rem, calc(100vw - 2rem));
  border: 1px solid rgba(191, 216, 220, 0.12);
  border-radius: 0.7rem;
  background: rgba(8, 31, 38, 0.98);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.28);
  color: #f2f6f7;
  overflow: hidden;
`;

const SearchField = styled.input`
  width: 100%;
  padding: 1rem;
  border: 0;
  border-bottom: 1px solid rgba(191, 216, 220, 0.08);
  background: transparent;
  color: inherit;
  font: inherit;
  letter-spacing: 0.04em;
  outline: none;

  &::placeholder {
    color: rgba(242, 246, 247, 0.5);
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
      <button type="button" className={styles.sectionAction} onClick={() => dispatch(openSearch())}>
        {dictionary.search}
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
