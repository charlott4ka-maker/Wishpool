// E-mail sign-in with a one-time code, as a bottom sheet over the sign-in screen.

import { useState } from "react";
import { Alert, Pressable } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { Field, Pill, Sheet, Txt } from "./ui";
import { useT } from "../i18n";
import { haptic } from "../lib/haptics";

export function EmailSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, lang } = useT();
  const { startEmail, verifyEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  // the server's answer to a wrong / old code, shown under the field
  const [codeError, setCodeError] = useState("");
  const fail = (e: unknown) => {
    const m = (e as Error)?.message;
    if (m === "bad_code") return setCodeError(t("emailBadCode")), haptic("error");
    if (m === "code_expired" || m === "too_many_attempts") return setCodeError(t("emailCodeExpired")), haptic("error");
    Alert.alert(t(m === "too_soon" ? "emailTooSoon" : m === "mail_failed" ? "emailSendFailed" : "signInFailed"));
  };
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
      await startEmail(email, lang);
      setSent(true);
      setCode("");
      setCodeError("");
    } catch (e) {
      fail(e);
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
    } catch (e) {
      fail(e);
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t("emailTitle")}>
      <Field label={t("emailLabel")} value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" textContentType="emailAddress" autoCapitalize="none" autoFocus error={tried && !sent && !valid && t("invalidEmail")} />
      {sent ? (
        <>
          <Txt className="-mt-2 mb-4 text-[12.5px] text-t3">{t("emailCodeSent", { email: email.trim() })}</Txt>
          <Field label={t("emailCodeLabel")} value={code} onChangeText={(v) => (setCode(v), setCodeError(""))} placeholder="123456" keyboardType="number-pad" textContentType="oneTimeCode" autoFocus error={codeError || (tried && sent && code.trim().length < 4 && t("requiredField"))} />
          <Pill full onPress={verify}>{t("emailVerify")}</Pill>
          <Pressable onPress={send} hitSlop={8} className="mt-4 items-center">
            <Txt className="font-m600 text-sm text-blueText">{t("emailResend")}</Txt>
          </Pressable>
        </>
      ) : (
        <Pill full onPress={send}>{t("emailSend")}</Pill>
      )}
    </Sheet>
  );
}
