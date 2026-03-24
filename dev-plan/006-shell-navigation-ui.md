# 006-shell-navigation-ui

## Goal
Replicate the shared Flashscore-style shell and navigation system, including monetization-aware layout slots, with a mobile-first and fully translated UX.

## Build
1. Implement the global header with brand slot, `Scores`, `News`, search, login or profile, and utility actions, keeping major actions reachable in 1 to 2 taps on mobile.
2. Build the horizontal sports strip with favorites, major sports, and a `More` overflow entry, tuned for touch-first mobile browsing.
3. Build the responsive three-column shell: left rail, center content, and right rail that can host ads, affiliate widgets, Telegram or WhatsApp CTAs, and promo blocks without breaking the core layout.
4. Implement left-rail modules for pinned leagues, my teams, country browsing, and quick access to major competitions.
5. Add design tokens and layout primitives tuned for dense data rows, tabs, pills, compact cards, prediction widgets, CTA banners, and inline monetization slots in both dark and light themes.
6. Add i18n foundations, locale-aware formatting, footer, consent shell, ad-slot placeholders, and geo-aware legal disclaimer zones for regulated content, with 100% translation coverage for shell UI.
7. Ensure the shell stays 100% responsive, fast to render, and free of horizontal overflow across all supported breakpoints.

## Done When
- The shared shell feels structurally aligned with the Flashscore reference.
- Navigation is usable on desktop and mobile.
- Layout primitives support both parity surfaces and monetization modules without redesign.
- The shell is fast, fully translated, theme-complete, and efficient to use in 1 to 2 interactions for primary navigation actions.
