// Settings › Support: a chat with us. Messages go to the admin page's
// «Поддержка» tab (and to support@ by mail); answers come back here, with a red
// count on the Support row until they're read. Guests still get the e-mail.
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { ArrowUp, ChevronLeft } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Sticker } from "../components/Sticker";
import { toast } from "../components/Toast";
import { Press } from "../components/Press";
import { GlassCircle, Txt } from "../components/ui";
import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { api, type SupportMsg } from "../services/api";
import { useWishpool } from "../store/WishpoolContext";
import { useAccent } from "../theme/accent";
import { C } from "../theme/tokens";

const time = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function SupportScreen() {
  useAccent(); // re-render in place when the app colour changes
  const { t, lang } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refresh } = useWishpool();
  const [msgs, setMsgs] = useState<SupportMsg[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.support();
      setMsgs(r.messages);
      refresh().catch(() => {}); // the red count goes away
    } catch {
      setMsgs((m) => m || []);
    }
  }, [refresh]);
  useEffect(() => {
    load();
    // an answer can come while the chat is open
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  const send = async () => {
    const v = text.trim();
    if (busy) return;
    if (!v) return haptic("error");
    setBusy(true);
    try {
      const meta = `Wishpool ${Constants.expoConfig?.version || ""} · ${Platform.OS} ${Platform.Version} · ${lang}`;
      const r = await api.sendSupport(v, meta);
      setMsgs((m) => [...(m || []), r.message]);
      setText("");
      haptic("success");
    } catch {
      haptic("error");
      toast.error(t("toastError"));
    } finally {
      setBusy(false);
    }
  };

  const empty = msgs !== null && msgs.length === 0;
  return (
    <KeyboardAvoidingView className="flex-1 bg-card" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="flex-row items-center px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <GlassCircle onPress={() => router.back()} label={t("back")}>
          <SymbolView name="chevron.left" size={19} weight="semibold" tintColor={C.t1} fallback={<ChevronLeft size={22} color={C.t1} />} />
        </GlassCircle>
        <View pointerEvents="none" className="absolute bottom-2 left-0 right-0 h-sm items-center justify-center">
          <Txt className="font-m800 text-[20px]">{t("supportChat")}</Txt>
        </View>
      </View>

      {msgs === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={C.t2} />
        </View>
      ) : empty ? (
        // centred in the free space: sticker, title, the line under it
        <View className="flex-1 items-center justify-center px-8">
          <Sticker emoji="stk:envelope" size={88} />
          <Txt className="mt-6 text-center font-m800 text-[20px]">{t("supportEmptyTitle")}</Txt>
          <Txt className="mt-2 text-center text-[15px] leading-[21px] text-t2">{t("supportEmptySub")}</Txt>
        </View>
      ) : (
        <ScrollView
          ref={scroll}
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={{ padding: 16, gap: 8 }}
        >
          {msgs.map((m) => {
            const mine = m.author === "user";
            return (
              <View key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%" }}>
                {mine ? null : <Txt className="mb-1 ml-3 font-m700 text-[12px] text-t2">{t("supportTeam")}</Txt>}
                <View className={`rounded-[20px] px-4 py-3 ${mine ? "bg-blue" : "bg-raised"}`}>
                  <Txt className={`text-[15.5px] leading-[21px] ${mine ? "text-white" : "text-t1"}`}>{m.text}</Txt>
                </View>
                <Txt className={`mt-1 text-[11.5px] text-t3 ${mine ? "mr-3 text-right" : "ml-3"}`}>{time(m.at)}</Txt>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* the message field, pinned above the keyboard */}
      <View className="flex-row items-end gap-2 px-4 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("supportPlaceholder")}
          placeholderTextColor={C.hint}
          multiline
          maxLength={4000}
          numberOfLines={1}
          className="flex-1 rounded-[20px] bg-card2 px-4 font-m500 text-[16px] text-t1"
          style={{ minHeight: 40, maxHeight: 140, paddingTop: 10, paddingBottom: 10 }}
        />
        {/* never greyed out: an empty tap just buzzes */}
        <Press onPress={send} accessibilityLabel={t("supportSend")}>
          <View className="h-sm w-[40px] items-center justify-center rounded-full bg-blue">
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <ArrowUp size={20} color="#fff" strokeWidth={2} absoluteStrokeWidth />}
          </View>
        </Press>
      </View>
    </KeyboardAvoidingView>
  );
}
