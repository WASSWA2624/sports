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
  padding: 5.5rem 1rem 1rem;
  background: rgba(6, 12, 24, 0.56);
  backdrop-filter: blur(16px);
`;

const Panel = styled.div`
  width: min(42rem, calc(100vw - 2rem));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.35rem;
  background: rgba(14, 22, 37, 0.96);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
  color: #f4f8ff;
  overflow: hidden;
`;

const SearchField = styled.input`
  width: 100%;
  padding: 1rem 1.1rem;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: inherit;
  font: inherit;
  outline: none;

  &::placeholder {
    color: rgba(244, 248, 255, 0.56);
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
