// A banner set on the admin page: a strip in the same place and shape as the
// guest sign-in strip (peeking out from behind the block below), in the admin's
// colours, with an optional sticker. A tap opens a link or the sign-in sheet;
// the round button on the right closes it for good (remembered on the phone).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ChevronRight, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { RemoteBanner as Banner, useRemoteConfig } from "../lib/remoteConfig";
import { usePrefs } from "../settings/prefs";
import { GUEST_OVERLAP } from "./GuestBanner";
import { Sticker } from "./Sticker";
import { BLOCK_GAP, BLOCK_R } from "./TabHeader";
import { Txt } from "./ui";

const KEY = "wp_banners_closed";

/** The banner to show now, if any: active, for this kind of user, with text in this language, not closed. */
export function useRemoteBanner(): { banner: Banner | null; close: (id: string) => void } {
  const { banners, previewBanner } = useRemoteConfig();
  const { status } = useAuth();
  const { lang } = useT();
  const demo = usePrefs().demo;
  const [closed, setClosed] = useState<string[] | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => setClosed(raw ? JSON.parse(raw) : []))
      .catch(() => setClosed([]));
  }, []);
  const close = (id: string) => {
    const next = [...(closed || []), id];
    setClosed(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };
  // the admin preview shows the banner being edited, whoever it's meant for
  const forced = previewBanner ? banners.find((b) => b.id === previewBanner) || null : null;
  if (forced) return { banner: forced, close: () => {} };
  if (!closed || demo) return { banner: null, close };
  const who = status === "signedIn" ? "signedIn" : "guest";
  const banner =
    banners.find((b) => (b.audience === "all" || b.audience === who) && !closed.includes(b.id) && (b.text[lang] || b.text.en || b.text.uk || b.text.ru)) || null;
  return { banner, close };
}

export function RemoteBanner({ banner, onClose }: { banner: Banner; onClose: () => void }) {
  const router = useRouter();
  const { lang } = useT();
  const text = banner.text[lang] || banner.text.en || banner.text.uk || banner.text.ru || "";
  const tap = () => {
    if (banner.action === "none") return;
    haptic("light");
    if (banner.action === "signin") router.push("/sign-in-options");
    else if (banner.url) WebBrowser.openBrowserAsync(banner.url).catch(() => {});
  };
  return (
    <Pressable onPress={tap} style={{ marginTop: BLOCK_GAP }}>
      <LinearGradient
        colors={[banner.color1, banner.color2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ borderTopLeftRadius: BLOCK_R, borderTopRightRadius: BLOCK_R, paddingTop: 10, paddingBottom: 10 + GUEST_OVERLAP, paddingLeft: 16, paddingRight: 12 }}
      >
        <View className="flex-row items-center gap-3">
          {banner.sticker ? <Sticker emoji={banner.sticker} size={22} /> : null}
          <Txt numberOfLines={2} className="flex-1 font-m700 text-[15px]" style={{ color: banner.textColor }}>{text}</Txt>
          {banner.dismissible || banner.action !== "none" ? (
            <Pressable
              hitSlop={8}
              onPress={() => {
                if (!banner.dismissible) return tap();
                haptic("light");
                onClose();
              }}
              style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              {banner.dismissible ? (
                <X size={16} color={banner.textColor} strokeWidth={1.5} absoluteStrokeWidth />
              ) : (
                <ChevronRight size={16} color={banner.textColor} strokeWidth={1.5} absoluteStrokeWidth />
              )}
            </Pressable>
          ) : null}
        </View>
      </LinearGradient>
    </Pressable>
  );
}
