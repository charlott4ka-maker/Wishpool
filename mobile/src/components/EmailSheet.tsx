// E-mail sign-in with a one-time code, as a bottom sheet over the sign-in screen.

import { useState } from "react";
import { Alert } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { Field, Pill, Sheet, Txt } from "./ui";
import { useT } from "../i18n";
import { haptic } from "../lib/haptics";

export function EmailSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useT();
  const { startEmail, verifyEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // no greyed-out buttons: a tap with a missing field outlines it in red
  const [tried, setTried] = useState(false);
  const send = async () => {
    if (busy) return;
    if (!valid) {
      setTried(true);
      return haptic("error");
    }
    setBusy(true);
    try {
      await startEmail(email);
      setSent(true);
    } catch {
      Alert.alert(t("signInFailed"));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (busy) return;
    if (code.trim().length < 4) {
      setTried(true);
      return haptic("error");
    }
    setBusy(true);
    try {
      await verifyEmail(email, code);
    } catch {
      Alert.alert(t("signInFailed"));
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t("emailTitle")}>
      <Field label={t("emailLabel")} value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" autoFocus error={tried && !sent && !valid} />
      {sent ? (
        <>
          <Txt className="-mt-2 mb-4 text-[12.5px] text-t3">{t("emailCodeSent", { email: email.trim() })}</Txt>
          <Field label={t("emailCodeLabel")} value={code} onChangeText={setCode} placeholder="123456" keyboardType="number-pad" error={tried && sent && code.trim().length < 4} />
          <Pill full onPress={verify}>{t("emailVerify")}</Pill>
        </>
      ) : (
        <Pill full onPress={send}>{t("emailSend")}</Pill>
      )}
    </Sheet>
  );
}
