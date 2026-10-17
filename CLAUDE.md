# Wishpool

## Talking to the user
- Reply in Russian, always using masculine forms for yourself ("сделал", "понял").
- Don't push to `main` on your own: commit to the work branch and ship to `main`
  only when the user says "в прод" (Vercel Hobby allows 100 deploys a day).

## UI rules (web/src/App.jsx)
- Font: Montserrat everywhere. Never use Regular (400); the lightest weight is Medium (500).
- Buttons and controls come in exactly two heights: `H.lg` (52) and `H.sm` (40).
- Spacing comes from a 4 / 8 / 12 / 16 / 24 / 32 scale.
- No outlines on blocks (cards, sheets, icon tiles), except: wish cards on the wishlist screen (a two-column grid, tap opens WishSheet) have a thin light outline (user request). The folder front has no outline, only a soft shadow on the photos behind it.
- Emoji are rendered as outlined stickers (`Sticker`), never as plain text; image
  stickers are "stk:<name>" WebPs in web/public/stickers with the white rim baked
  into the file (no SVG filter for them; it breaks up on iOS at large sizes).
- Icons: lucide-react (the user prefers these over SF-style icons).
- Modals are bottom sheets (`Sheet`).
- No em/en dashes in UI copy (uk/ru/en).

## iOS app (mobile/)
- Separate Expo project; shares design tokens, copy and stickers with the Mini App.
- Font: the iOS system font SF Pro (not Montserrat), weights 500-800 only.
- Tab bar: the system iOS tabs (`expo-router/unstable-native-tabs`, SF Symbols) with a thick dark material and a dark fade (`TabBarFade`) at the bottom of each tab screen, so content under the bar doesn't blend into it.
- Layout: blocks (`#15181D`) on a lighter page (`#222831`) with 4pt gaps; the tab header is the top block, rounded only at the bottom; the guest sign-in prompt is a blue strip peeking out from behind the block below it. Wish cards are glass blocks of their own (block fill at ~50% with a soft left-to-right gradient and a thin light outline).
- Never put `className` on Reanimated views (`Animated.View`, `createAnimatedComponent`): NativeWind doesn't style them on device. Animated views get plain `style`; for press springs use `Press` (styled Pressable inside a transform-only Animated.View).
