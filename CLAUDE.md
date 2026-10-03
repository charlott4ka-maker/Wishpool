# Wishpool

## UI rules (web/src/App.jsx)
- Font: Montserrat everywhere. Never use Regular (400); the lightest weight is Medium (500).
- Buttons and controls come in exactly two heights: `H.lg` (52) and `H.sm` (40).
- Spacing comes from a 4 / 8 / 12 / 16 / 24 / 32 scale.
- No outlines on blocks (cards, sheets, icon tiles).
- Emoji are rendered as outlined stickers (`Sticker`), never as plain text; image
  stickers are "stk:<name>" PNGs in web/public/stickers.
- Icons: lucide-react (the user prefers these over SF-style icons).
- Modals are bottom sheets (`Sheet`).
- No em/en dashes in UI copy (uk/ru/en).
