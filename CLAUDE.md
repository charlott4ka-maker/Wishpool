# Wishpool

## Talking to the user
- Reply in Russian, always using masculine forms for yourself ("сделал", "понял").
- Don't push to `main` on your own: commit to the work branch and ship to `main`
  only when the user says "в прод" (Vercel Hobby allows 100 deploys a day).

## Telegram Mini App = the iOS app's web build
- `t.me/wishpool_bot/app` opens the site root, which sends Telegram (launch data in the URL hash) to `/tg` and everyone else to the landing (`/about`, App Store button first). `/tg` is the Expo web build (`npm run tg-build` in mobile/ → `web/public/tg`, committed; run it after app changes, like `admin-preview`). `lib/telegram.ts`: Telegram signs in (X-Init-Data on every request, no sign-in screens), Telegram language, haptics, links via openLink, sharing via t.me/share with `startapp` links (`<room>__<inviter>` → join, `fr_<code>` → friend). Web-only tab bar in `app/(tabs)/_layout.web.tsx`. No notification switches or sign out in Telegram.
- The old Mini App (`web/src/App.jsx`) is no longer served; its rules below still describe the shared look.

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
- Stickers: no branded ones in the iOS picker or demos (McDonald's bag, Nike sneakers, Hello Kitty, Sims plumbob, Mario ?-block); their files stay so older wishes still render. Keep them off App Store screenshots too.
- Avatar stacks: a see-through gap masked out of each avatar (`Avatar cut`), never a painted ring.
- Toggles are the stock iOS `Switch` (no custom track colours). The back button is the SF Symbol `chevron.left` in a round button; pushed-screen titles are centred.
- Toasts: dark pill from the top with a filled round icon (check blue, cross red, both with a soft glow; info grey "i" without a glow).
- Empty states: centred in the free space (between header and keyboard when searching), the same gap from the sticker to the text as from the text to the button, the sub close under the title; the search-miss state uses the eyes sticker.
- Icons in small round buttons: even sizes so they sit dead centre, 1.5px stroke (`absoluteStrokeWidth`).
- Motion: no bounce on things appearing (photos, stickers, cards); springs are fine for presses and for the segmented control, which stretches like the iOS tab bar selection.
- Forms: no greyed-out (disabled) action buttons in sheets; a tap with a required field missing outlines that field in red with a short line under it ("Fill this in"), via `Field error` / `DateRow error`, plus an error haptic. Labels never say "(optional)".
- New/edit wish and new/edit room are full-screen modals, not sheets (dragging the folder sticker or a photo pulled a sheet along): the same header with the glass close button, the main button pinned to the bottom (`SheetFooter`) with a fade above it. The folder sticker on the room preview can be dragged; it never covers the avatars.
- Round icon buttons (the "+" by titles, back, sheet close) are `GlassCircle`: iOS Liquid Glass, blur fallback.
- Swipes: onboarding pages flip with a swipe. Tabs switch only from the tab bar (a mid-screen swipe between tabs was tried and dropped).
- Search (Wishes): while it's active the title row folds away, the field moves up, and the sign-in strip hides. No "Cancel" text: the × inside the field clears it and closes the search.
- Never put `className` on Reanimated views (`Animated.View`, `createAnimatedComponent`): NativeWind doesn't style them on device. Animated views get plain `style`; for press springs use `Press` (styled Pressable inside a transform-only Animated.View).

## Admin (web/public/admin)
- `wishpool.clickbrickk.com/admin`: stats, text overrides, Wishes-tab banners, hidden/uploaded stickers, reports; config stored in `app_config` and served by `GET /api/config`. Sign-in: one login and password (`ADMIN_LOGIN` / `ADMIN_PASSWORD` on Vercel, `server/admin-auth.js`), no e-mail codes.
- Live phone preview (iPhone 14 Pro Max, 430x932) on the right: the app's web build in `web/public/admin/preview` (guest + demo content, `lib/adminPreview.ts`), fed the unsaved draft; tapping a text opens its screen and outlines it (`screens` in app-data.json). After app changes worth previewing run `npm run admin-preview` in mobile/ (rebuilds the preview and app-data.json).
- Moderation (App Review 1.2): in a room, ⋯ by a friend's name reports or blocks them, a long press on their wish reports it; `/terms` has the zero-tolerance terms (linked under the sign-in buttons). Reports land in the admin «Жалобы» tab and on support@; blocked people stay in the room with their wishes hidden.

## Friends and the draw (server/friends.js)
- No search and no public IDs: friends come from a room (member ⋯ › Add friend, a request the other accepts) or a personal link `/friend/<code>` (whoever opens it becomes a friend at once). Profile › Friends lists room invitations, requests, the link and friends; a red count on the profile row while some wait (`inbox` in /state).
- One privacy setting (Settings › Privacy › Rooms): friends add you to rooms right away, or with an invitation you accept (default). Strangers can't add anyone. New room: pick friends; room ⋯ › Add friends.
- The draw (`server/draw.js`) lives in friends rooms only (not couple / birthday): a card above the friends' lists, 3+ people, optional budget, "You got …" once drawn. One ring, fair shuffle. Only the owner runs it (first time too) and runs it again; everyone, the owner included, sees only their own person. "Never each other" pairs (picked in the draw sheet) and blocks are never matched. Leaving, a deleted account or a new block changes only one pair (fixed lazily on GET); late joiners wait until the owner taps "Add to the draw" (again one pair each). The Mini App only shows your pair once drawn.

## Secret Santa, demo, releases
- Secret Santa is a room type in New room (`app/room/new.tsx` PRESETS): a `friends` room (so it has the draw) with an optional gift swap date (friends rooms keep `eventDate` on the server; countdown + local reminders). Its picker shows only the New Year pack (`newyear` in `subscription/featureFlags.ts`: santa, tree, snowman, gingerbread, bauble, reindeer); a room counts as Santa when its sticker is one of `NEW_YEAR_STICKERS`. The first time someone opens one on a phone, snow falls (`components/Snowfall.tsx`, key `wp_snow_<roomId>`). Stickers were generated with the OpenAI API (gpt-image-1-mini, cheap) and given our rim/shadow/margins; keep new ones the same size as the rest. The user turned down a type-first New room flow: keep it one screen.
- Room screen: the hero and the tabs stay put, only the lists scroll (fade under the tabs). Tap a member's picture for a mini profile sheet (`app/room/member.tsx`, Add friend). Wish notes: grey info icon 6pt from the text, centred on one-line notes, at the top for longer ones. Guests tapping Profile › Friends get a sign-in sheet (`app/friends-guest.tsx`).
- New/edit wish and room: the title and close stay pinned (`FormHeader` in `components/SheetHeader.tsx`) with a soft fade under them. Wish price fields take numbers only.
- Demo content: hidden in Settings (7 taps on the version line). A guest gets local demo data (`lib/demo.ts`); signed in, "Demo: fill this account" refills the App Review account on the server (`POST /review-demo`, `server/review-demo.js`, refused for anyone else); a language change refills it. App Review / TestFlight account: REVIEW_EMAIL `review@wishpool.clickbrickk.com` (code in the REVIEW_CODE env on Vercel).
- Releases: OTA (`npx.cmd eas-cli update --channel production` in mobile/, the user runs it in PowerShell from `C:\Users\Dariia\wishpool\mobile`) reaches only builds with the same app version (runtimeVersion = appVersion). `lib/quickUpdate.ts` holds the splash up to 3s and restarts into a fresh update, so it shows on that launch (from the 1.0.1 build on). 1.0.1 (friends, privacy, draw, Secret Santa, rating) was pulled from review to rebuild with everything inside; App Store 1.0.0 users get none of it until 1.0.1 is out. ASC app id 6825104468.
- Store copy (RU/UA/EN) and Figma screenshot sections ("store img 1.0.1 EN/UA/RU") live in the user's Figma file; RU screens' headline on the wishes slide: "Желание в два клика".

## Premium (agreed 2026-11, launch ~December)
- Price: $4.99 a month and $24.99 a year (the year is the main offer; 7 free days on it), a lower custom price for Ukraine in App Store Connect. Apple in-app purchases on iPhone (native: needs a new build and review).
- Free forever: rooms, friends, reservations, chip in, the draw, Secret Santa, birthday reminders, no limits on counts. Premium is about looking special, never about the social loop.
- Premium v1: folder materials (leather, velvet, denim, kraft, holographic, frosted glass, gift wrap...), your own photo as a folder cover, extra stickers / charms / a name tag on the folder, exclusive 3D stickers, one premium app icon (the glossy star with a bow), app accent colour themes, a home-screen widget (countdown to a birthday, "you're giving ...").
- Folder materials picked (drafts in `design/folders`, GPT edits of our silhouette `_template`): suede, fawn fur, pink leopard fur, burgundy croc, cable knit, cobalt puffer, cow fur, airmail with stamps, orange with a frog in a party hat, graffiti on metal, red gift with a white bow, pink gummy, red Christmas sweater with deer, red with a black spider web (no Spider-Man or any other licensed character or brand).
- After v1 ships, PROPOSE to the user (she asked to be reminded): animated folders (snow, hearts, confetti) and monthly seasonal collections.

## Later (agreed, not started)
- Admin-only alternate app icon: a Settings row "Icon" visible only to admins (`admin` from /state) to switch to the glossy star-with-bow icon on her own phone (expo alternate icons; one build for TestFlight and the App Store). Needs a new build, so after App Review approves 1.0.0; she sends the 1024x1024 artwork.
- Ideas the user liked: anonymous question to a wish owner, "card from everyone" on the birthday, gift hints in the profile (sizes), price-drop alerts, a home-screen widget.
- Rating prompt (`lib/review.ts`, after the 3rd wish, plus "Rate Wishpool" in Settings) is native (expo-store-review): it ships with the 1.0.1 build.
- iPhone Duo (foldable, inner display ~626x890pt, ignores the portrait lock): grids go to 3 columns from 560pt (`lib/gridColumns.ts`); the "Made for iPhone Duo" badge needs a build with the iOS 27.1 SDK, but 1.0.1 built on `ios.image: latest` crashed at launch on iOS 27.0.1, so production builds stay on EAS's default image for now; try the newer image again with a TestFlight check on a 27.0 phone first. Duo screenshots are required from April 2027.
