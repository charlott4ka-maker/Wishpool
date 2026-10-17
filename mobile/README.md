# Wishpool for iOS (Expo / React Native)

Native iOS app built on the Telegram Mini App in `../web`. It is a separate
project: nothing in `web/`, `server/`, `api/` or the Vercel config changes, and
the Mini App keeps deploying from `main` exactly as before.

Stack: Expo SDK 57 (what Expo Go in the App Store runs), Expo Router, NativeWind 4 (Tailwind 3), EAS Build,
RevenueCat (`react-native-purchases`), `expo-apple-authentication`,
`expo-alternate-app-icons`.

## Run

    cd mobile
    npm install
    cp .env.example .env.local      # fill in what you have
    npx expo start                  # Expo Go works in guest mode, purchases are mocked
    npm test                        # affiliate converter + OG parser
    npm run typecheck

Sign in with Apple, RevenueCat and alternate icons are native modules, so try
them in a development build: `npm run build:dev` (EAS, iOS simulator), or
`npx expo run:ios` on a Mac.

Release: `npm run build:ios` then `npx eas-cli@latest submit -p ios`. The
first `eas build` asks to create the EAS project and writes its id into app.json.

## Layout

    src/app/                 screens (Expo Router)
      (tabs)/index.tsx       Бажання: wish pool, filters, two-column cards
      (tabs)/rooms.tsx       Кімнати: rooms as folders
      (tabs)/profile.tsx     Профіль: stats, Premium, app icon, language
      room/[id].tsx          room: friends' lists, "I'll get it" (Даруй таємно)
      room/new.tsx           new room (Premium sticker packs locked)
      wish/new.tsx           new / edit wish: link -> preview -> affiliate link on save
      paywall.tsx            Wishpool Premium
      sign-in.tsx            onboarding, then Sign in (Apple / e-mail) or guest
    src/components/          Sticker, Pill, Chip, Segmented, Sheet, WishTile, RoomFolder, TabBarFade...
    src/services/
      affiliateConverter.ts  product URL -> affiliate URL (Amazon, Admitad, Rozetka, subid)
      affiliate/shops.ts     known shops and their network
      affiliate/config.ts    tags from env
      linkPreview.ts         OG / JSON-LD parsing (title, price, photo)
      api.ts                 backend client (Bearer token)
    src/subscription/        SubscriptionContext (isPremium), RevenueCat adapter, feature flags, app icons
    src/auth/                AuthContext (Apple, e-mail, guest)
    src/i18n/                uk / ru / en; webStrings.ts is copied from web/src/App.jsx
    assets/stickers/         the same WebP stickers as web/public/stickers

Design tokens (colours, 52/40 control heights, radii) live in
`tailwind.config.js` and `src/theme/tokens.ts` and match `C`/`H`/`R` in
`web/src/App.jsx`. Font: the iOS system font (SF Pro), weights 500-800 via
`font-m500`...`font-m800`. The tab bar is the system iOS one (native tabs, SF Symbols) with a dark
fade under it (`TabBarFade`).

## Affiliate links

`toAffiliateUrl(url)` runs when a wish is saved:

| Shop | What happens |
| --- | --- |
| Amazon (all marketplaces) | `?tag=<EXPO_PUBLIC_AMAZON_ASSOCIATES_TAG>&ascsubtag=<tag>`, someone else's tag removed. No tag configured: link unchanged |
| Rozetka | Admitad deeplink if `rozetka` is in `EXPO_PUBLIC_ADMITAD_LINKS`, else Rozetka Affiliate id, else `?subid=<tag>` |
| MAKEUP, Zara, AliExpress, Notino, Answear, EVA, Allo, Comfy, Foxtrot, Epicentr, ... | Admitad deeplink `https://ad.admitad.com/g/<hash>/?ulp=<url>&subid=<tag>`, else `?subid=<tag>` |
| H&M, Sephora, Prom, Kasta, Temu, eBay, Etsy | `?subid=<tag>` |
| anything else | unchanged |

`<tag>` is `EXPO_PUBLIC_AFFILIATE_TAG` (or `AFFILIATE_TAG` in Node), default
`wishpool`. Links wrapped by Google/Facebook/someone's Admitad are unwrapped
first; tracking params (utm, gclid, fbclid...) are dropped; converting twice
gives the same link. Add a shop in `src/services/affiliate/shops.ts`.

The link preview reads the page directly from the phone (no CORS on native)
and falls back to the backend's `/api/preview` for shops that block phones.

## Premium

Hidden for now: `PREMIUM_ENABLED = false` in `src/subscription/featureFlags.ts`
turns off the paywall, the Premium card, locked sticker packs, app icons and
upsell hints. Set it to `true` to bring all of it back.

`useSubscription()` gives `isPremium`, `photoLimit`, `can(feature)`,
`isStickerLocked(emoji)`, `packages`, `purchase`, `restore`.

- Photos per wish: Free 1, Premium 3 (`PLAN_LIMITS`). The backend keeps up to 3
  (`MAX_IMAGES` in server/util.js): raise both to go to 5.
- Sticker packs with `isPremiumOnly: true` (`STICKER_PACKS`). The "party" pack
  holds the 5 spare stickers as a placeholder until the exclusive 3D pack is drawn.
- Alternate app icons: Ocean, Blush, Matcha (`app.json` plugin + `subscription/appIcon.ts`).

RevenueCat: entitlement `premium`, offering `default` with monthly and annual
packages; set `EXPO_PUBLIC_REVENUECAT_IOS_KEY`. Without a key (or in Expo Go)
a mock store is used; in a release build without a key nothing can be bought.
Before App Review the paywall also needs links to Terms of Use and the Privacy Policy.

## iOS features

- Onboarding (3 pages from the Mini App) on first launch, then Sign in / Continue without an account.
- Share extension: Share → Wishpool from Safari or a shop app opens New wish with the link
  (`expo-share-intent`; dev / store build only, not Expo Go).
- Long press on a wish card: native preview + context menu (edit, share, I got it, delete).
- Room invites through the iOS share sheet.
- Native date pickers: birthday room date, my birthday in Settings.
- Local reminders for birthday rooms (a week and a day before, 10:00), switches in Settings.
- Large titles that collapse on scroll, and native search on Wishes and Rooms.
- Native sheets (formSheet routes) with a close button; Settings in the iOS Settings style.

## Backend (server/, same deployment as the Mini App)

- Sign-in: `server/native-auth.js`.
  - `POST /api/auth/apple`: the Apple identity token is checked against Apple's keys (audience `app.wishpool.ios`, or `host.exp.Exponent` in Expo Go; nonce = SHA-256 of the raw nonce).
  - `POST /api/auth/email/start|verify`: a 6-digit code by e-mail through Resend.
  - Both return `{ token, user }`; the app sends `Authorization: Bearer <token>`. Apple and the same e-mail open one account.
- `PATCH /api/me` (name, photo), `DELETE /api/me` (everything goes; owned rooms pass to another member), `POST /api/sign-out`.
- Invites: `https://wishpool.clickbrickk.com/join/<roomId>?from=<userId>` is a universal link (`/.well-known/apple-app-site-association`, needs `APPLE_TEAM_ID`). Without the app, the page sends people to the Telegram Mini App.
- iPhone accounts and Telegram accounts are separate for now; rooms are shared, so both can be in one room.
- Vercel env: `RESEND_API_KEY`, `MAIL_FROM`, `APPLE_TEAM_ID`, `REVIEW_EMAIL`, `REVIEW_CODE` (and the existing `DATABASE_URL`, `R2_*` for avatars).
- Test: `cd server && npm i --no-save @electric-sql/pglite && node native-auth.test.mjs` (add `PGLITE_TEST=1` for Postgres).

Still to do: `GET /api/me/premium` with a RevenueCat webhook, and push notifications.
