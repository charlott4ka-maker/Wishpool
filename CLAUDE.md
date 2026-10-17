# Wishpool

## Talking to the user
- Reply in Russian, always using masculine forms for yourself ("сделал", "понял").
- Don't push to `main` on your own: commit to the work branch and ship to `main`
  only when the user says "в прод" (Vercel Hobby allows 100 deploys a day).

## UI rules (web/src/App.jsx)
- Font: Montserrat everywhere. Never use Regular (400); the lightest weight is Medium (500).
- Buttons and controls come in exactly two heights: `H.lg` (52) and `H.sm` (40).
- Spacing comes from a 4 / 8 / 12 / 16 / 24 / 32 scale.
- No outlines on blocks (cards, sheets, icon tiles), except (Mini App only): wish cards on the wishlist screen (a two-column grid, tap opens WishSheet) have a thin light outline (user request). In the iOS app wish cards are plain (`raised` `#1E2228`) with a thin light outline too. The folder front has no outline, only a soft shadow on the photos behind it.
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
- Layout: blocks (`#15181D`) on a lighter page (`#222831`) with 4pt gaps; the tab header is the top block, rounded only at the bottom; the guest sign-in prompt is a blue strip (text left, chevron right, opens the sign-in sheet) peeking out from behind the block below it. Wish cards stay inside the content block with the chips; plain `raised` fill with a thin light outline (glass was tried and dropped).
- Colours: accent/buttons are the logo blue `#0A82F9`; the sign-in strip gradient runs `#047DFB` to `#2290F6` (the app icon's blue); profile, settings and the room screen sit on `#15181D` with cards a touch lighter (`raised` `#1E2228`); the neutral selected segment is a cool slate (`#353C49`), never a warm grey. Inputs share the tab track colour (`#222831`); secondary text and placeholders are cool greys (`t2` `#8B93A3`, `t3` `#626B7D`, placeholder `hint` `#6B7487`), never warm ones.
- Glass (e.g. Invite on the room hero): the system Liquid Glass (`expo-glass-effect` via `lib/liquidGlass.ts`) on iOS 26, which brings its own edge light; elsewhere a fill over a blur and nothing else. Never paint a separate outline/rim on glass. Glass on a flat fill shows nothing, so give it something to frost.
- Avatar stacks: a see-through gap masked out of each avatar (`Avatar cut`), never a painted ring.
- Toggles are the stock iOS `Switch` (no custom track colours). The back button is the SF Symbol `chevron.left` in a round button; pushed-screen titles are centred.
- Toasts: dark pill from the top with a filled round icon (check blue, cross red, both with a soft glow; info grey "i" without a glow).
- Empty states: centred in the free space (between header and keyboard when searching), the same gap from the sticker to the text as from the text to the button, the sub close under the title; the search-miss state uses the eyes sticker.
- Icons in small round buttons: even sizes so they sit dead centre, 1.5px stroke (`absoluteStrokeWidth`).
- Motion: no bounce on things appearing (photos, stickers, cards); springs are fine for presses and for the segmented control, which stretches like the iOS tab bar selection.
- Forms: no greyed-out (disabled) action buttons in sheets; a tap with a required field missing outlines that field in red with a short line under it ("Fill this in"), via `Field error` / `DateRow error`, plus an error haptic. Labels never say "(optional)".
- Tall sheets (new/edit wish, new/edit room) pin their main button to the bottom (`SheetFooter`) with a fade above it.
- Round icon buttons (the "+" by titles, back, sheet close) are `GlassCircle`: iOS Liquid Glass, blur fallback.
- Search (Wishes): while it's active the title row folds away, the field moves up, and the sign-in strip hides. No "Cancel" text: the × inside the field clears it and closes the search.
- Never put `className` on Reanimated views (`Animated.View`, `createAnimatedComponent`): NativeWind doesn't style them on device. Animated views get plain `style`; for press springs use `Press` (styled Pressable inside a transform-only Animated.View).
