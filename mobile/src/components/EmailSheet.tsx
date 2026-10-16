// E-mail sign-in with a one-time code, as a bottom sheet over the sign-in screen.

import { useState } from "react";
import { Alert } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { Field, Pill, Sheet, Txt } from "./ui";
import { useT } from "../i18n";

export function EmailSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useT();
  const { startEmail, verifyEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const send = async () => {
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
      <Field label={t("emailLabel")} value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" autoFocus />
      {sent ? (
        <>
          <Txt className="-mt-2 mb-4 text-[12.5px] text-t3">{t("emailCodeSent", { email: email.trim() })}</Txt>
          <Field label={t("emailCodeLabel")} value={code} onChangeText={setCode} placeholder="123456" keyboardType="number-pad" />
          <Pill full disabled={code.trim().length < 4 || busy} onPress={verify}>{t("emailVerify")}</Pill>
        </>
      ) : (
        <Pill full disabled={!valid || busy} onPress={send}>{t("emailSend")}</Pill>
      )}
    </Sheet>
  );
}
