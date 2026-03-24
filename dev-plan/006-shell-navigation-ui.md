# 006-shell-navigation-ui

## Goal
Replicate the shared Flashscore-style shell and navigation system, including monetization-aware layout slots.

## Build
1. Implement the global header with brand slot, `Scores`, `News`, search, login or profile, and utility actions.
2. Build the horizontal sports strip with favorites, major sports, and a `More` overflow entry.
3. Build the responsive three-column shell: left rail, center content, and right rail that can host ads, affiliate widgets, Telegram or WhatsApp CTAs, and promo blocks without breaking the core layout.
4. Implement left-rail modules for pinned leagues, my teams, country browsing, and quick access to major competitions.
5. Add design tokens and layout primitives tuned for dense data rows, tabs, pills, compact cards, prediction widgets, CTA banners, and inline monetization slots.
6. Add i18n foundations, locale-aware formatting, footer, consent shell, ad-slot placeholders, and geo-aware legal disclaimer zones for regulated content.

## Done When
- The shared shell feels structurally aligned with the Flashscore reference.
- Navigation is usable on desktop and mobile.
- Layout primitives support both parity surfaces and monetization modules without redesign.
