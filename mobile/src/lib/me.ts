// You, as the profile shows you: the name and photo from the profile editor
// (or the account's), the account's colour (the one friends see), purple for a
// guest. Your own avatar in room stacks and folders uses exactly this.
import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n";
import { usePrefs } from "../settings/prefs";
import type { Member } from "../types";

export type Me = { name: string; color: string; photo?: string | null };

export function useMe(): Me {
  const { user } = useAuth();
  const { t } = useT();
  const prefs = usePrefs();
  return { name: prefs.displayName || user?.name || t("guest"), color: user?.color || "#7B61FF", photo: prefs.avatar || user?.photo };
}

/** Your entry in a member list ("me" on the phone, `you` from the server) shown as the profile. */
export const asMe = <T extends Member & { you?: boolean }>(m: T, me: Me): T =>
  m.id === "me" || m.you ? { ...m, name: me.name, color: me.color, photo: me.photo ?? null } : m;
