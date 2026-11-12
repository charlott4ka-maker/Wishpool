// In-app notifications: the admin page's list, for this person (who they are,
// their language), newest first, with what they've read (kept on the phone).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Bell, CalendarDays, Crown, Gift, Heart, Info, type LucideIcon, Megaphone, Palette, Snowflake, Sparkles, Star, Users } from "lucide-react-native";
import { useEffect, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n";
import { type NewsItem, onToday, useRemoteConfig } from "./remoteConfig";

export const NEWS_ICON: Record<string, LucideIcon> = { bell: Bell, gift: Gift, sparkles: Sparkles, snowflake: Snowflake, star: Star, heart: Heart, info: Info, megaphone: Megaphone, crown: Crown, calendar: CalendarDays, palette: Palette, users: Users };

type L = { uk?: string; ru?: string; en?: string };
export const pick = (v: L | undefined, lang: string) => (v ? (v as Record<string, string | undefined>)[lang] || v.en || v.uk || v.ru || "" : "");

const KEY = "wp_news_read";
let read: string[] | null = null;
const subs = new Set<(r: string[]) => void>();
AsyncStorage.getItem(KEY)
  .then((raw) => {
    read = raw ? JSON.parse(raw) : [];
    subs.forEach((cb) => cb(read!));
  })
  .catch(() => {
    read = [];
  });
const save = (next: string[]) => {
  read = next;
  subs.forEach((cb) => cb(next));
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
};
export const markRead = (id: string) => read && !read.includes(id) && save([...read, id]);
export const markAllRead = (ids: string[]) => read && save([...new Set([...read, ...ids])]);

export function useNews(): { items: NewsItem[]; read: string[]; unread: number } {
  const { news } = useRemoteConfig();
  const { status } = useAuth();
  const { lang } = useT();
  const [r, setR] = useState<string[]>(read || []);
  useEffect(() => {
    subs.add(setR);
    if (read) setR(read);
    return () => {
      subs.delete(setR);
    };
  }, []);
  const who = status === "signedIn" ? "signedIn" : "guest";
  const items = (news || [])
    .filter((n) => (n.audience === "all" || n.audience === who) && onToday(n.date, n.until) && pick(n.title, lang))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return { items, read: r, unread: items.filter((n) => !r.includes(n.id)).length };
}
