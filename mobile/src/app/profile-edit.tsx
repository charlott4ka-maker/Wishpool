// Edit your name and photo (tap the avatar on the profile). A guest keeps them
// on the phone in prefs; with an account they go to the server (PATCH /me).

import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Camera, ImagePlus, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../auth/AuthContext";
import { Press } from "../components/Press";
import { SheetHeader } from "../components/SheetHeader";
import { toast, ToastHost } from "../components/Toast";
import { Avatar, AvatarBadge, Field, Pill } from "../components/ui";
import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { useMe } from "../lib/me";
import { api } from "../services/api";
import { setPref, usePrefs } from "../settings/prefs";
import { useWishpool } from "../store/WishpoolContext";
import { C } from "../theme/tokens";
import { useAccent } from "../theme/accent";

export default function ProfileEdit() {
  useAccent(); // re-render in place when the app colour changes
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { online } = useWishpool();
  const prefs = usePrefs();
  const me = useMe();
  const [name, setName] = useState(prefs.displayName || user?.name || "");
  const [photo, setPhoto] = useState<string | null>(prefs.avatar ?? user?.photo ?? null);
  const [tried, setTried] = useState(false);

  // picking + shrinking the photo takes a moment: a spinner on the avatar and the button meanwhile
  const [picking, setPicking] = useState(false);
  const pick = async () => {
    if (picking) return;
    haptic("light");
    setPicking(true);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 });
      if (res.canceled) return;
      // small square JPEG as a data URL: survives cache clean-ups, fits in prefs
      const r = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 320 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      setPhoto(`data:image/jpeg;base64,${r.base64}`);
    } catch {
      toast.error(t("toastError"));
    } finally {
      setPicking(false);
    }
  };
  const remove = () => {
    haptic("light");
    setPhoto(null);
  };

  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim()) {
      setTried(true);
      return haptic("error");
    }
    if (busy) return;
    if (online) {
      // the account's name and photo are what friends see in rooms
      setBusy(true);
      try {
        const res = await api.updateMe({ name: name.trim(), photo });
        if (user) await updateUser({ ...user, name: res.user.name, photo: res.user.photo || null });
        setPref("displayName", null);
        setPref("avatar", null);
      } catch (e) {
        setBusy(false);
        if ((e as Error)?.message !== "photo_not_saved") return toast.error(t("toastError"));
        // the name went through on its own
        await api.updateMe({ name: name.trim() }).then((res) => user && updateUser({ ...user, name: res.user.name })).catch(() => {});
        toast.error(t("photoNotSaved"), { root: true });
        return router.back();
      }
    } else {
      setPref("displayName", name.trim());
      setPref("avatar", photo);
    }
    haptic("success");
    router.back();
    toast.success(t("toastSaved"), { root: true });
  };

  return (
    <View className="bg-card px-4 pt-6" style={{ paddingBottom: insets.bottom + 16 }}>
      <SheetHeader title={t("editProfile")} />
      <View className="mb-6 items-center">
        <View>
          <Press scaleTo={0.95} onPress={pick} accessibilityLabel={t(photo ? "changePhoto" : "addPhoto")}>
            <Avatar m={{ name: name || t("guest"), color: me.color, photo }} size={96} />
            {picking ? (
              <View className="absolute inset-0 items-center justify-center rounded-full bg-black/45">
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
            {!photo ? (
              <AvatarBadge bg={C.blue} ring={C.card} style={{ right: -3, bottom: -3 }}>
                <Camera size={16} color="#fff" strokeWidth={1.5} absoluteStrokeWidth />
              </AvatarBadge>
            ) : null}
          </Press>
          {/* with a photo: remove it right on the avatar */}
          {photo && !picking ? (
            <Pressable onPress={remove} hitSlop={10} accessibilityLabel={t("removePhoto")} style={{ position: "absolute", right: -3, top: -3, width: 38, height: 38 }}>
              <AvatarBadge bg="#2D3440" ring={C.card}>
                <X size={16} color={C.t1} strokeWidth={1.5} absoluteStrokeWidth />
              </AvatarBadge>
            </Pressable>
          ) : null}
        </View>
        {/* one button: change the photo, or add one */}
        <View className="mt-4">
          <Pill size="sm" kind="ghost" loading={picking} icon={<ImagePlus size={16} color={C.t1} />} onPress={pick}>
            {t(photo ? "changePhoto" : "addPhoto")}
          </Pill>
        </View>
      </View>
      <Field label={t("yourName")} value={name} onChangeText={setName} placeholder={t("yourNamePh")} error={tried && !name.trim() && t("requiredField")} />
      <Pill full loading={busy} onPress={save}>{t("saveChanges")}</Pill>
      <ToastHost inSheet />
    </View>
  );
}
