import { useRouter } from "expo-router";
import { Pressable } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n";
import { Txt } from "./ui";

/** Guest mode reminder: data stays on this phone until the user signs in. */
export function GuestBanner() {
  const { status } = useAuth();
  const router = useRouter();
  const { t } = useT();
  if (status !== "guest") return null;
  return (
    <Pressable onPress={() => router.push("/sign-in-options")} className="mb-4 flex-row items-center gap-3 rounded-tile bg-card px-4 py-3">
      <Txt className="flex-1 text-[12.5px] leading-[17px] text-t2">{t("guestBanner")}</Txt>
      <Txt className="font-m600 text-[13px] text-blueText">{t("guestSignIn")}</Txt>
    </Pressable>
  );
}
