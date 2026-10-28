// Wishes and rooms for the whole app. Signed in: the Wishpool backend (the
// server the Telegram Mini App uses too). Guest: kept on the phone only, like
// the Mini App outside Telegram, so the app can be tried before signing in.

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { toast } from "../components/Toast";
import { useT } from "../i18n";
import { api } from "../services/api";
import { getPrefs, setPref } from "../settings/prefs";
import type { AppState, NewWish, Room, Wish } from "../types";

const LOCAL_KEY = "wp_local_state";
const CACHE_KEY = "wp_server_cache";
const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

type WishpoolValue = AppState & {
  ready: boolean;
  online: boolean;
  refresh: () => Promise<void>;
  addWish: (w: NewWish) => Promise<void>;
  updateWish: (id: string, w: Partial<NewWish>) => Promise<void>;
  deleteWish: (id: string) => Promise<void>;
  setGifted: (id: string, gifted: boolean) => Promise<void>;
  toggleWishRoom: (id: string, roomId: string) => Promise<void>;
  createRoom: (r: Pick<Room, "name" | "type" | "emoji" | "tint"> & Partial<Room>) => Promise<string>;
  /** Owner edits: name, sticker, colour (and a birthday room's date / name). */
  updateRoom: (id: string, r: Partial<Room>) => Promise<void>;
  /** Leave a room (or delete it for everyone when you own it). */
  removeRoom: (id: string, asOwner: boolean) => Promise<void>;
};

const Ctx = createContext<WishpoolValue | null>(null);
const EMPTY: AppState = { wishes: [], rooms: [] };

type ServerMe = { id: string; name: string; photo?: string | null; birthday?: string | null };

// A guest who signs in keeps what they made: the phone's rooms and wishes move
// into the account once (what's left is saved after each step, so a lost
// connection halfway never uploads anything twice). Demo content stays behind.
async function moveLocalToAccount(): Promise<boolean> {
  if (getPrefs().demo) return false;
  const raw = await AsyncStorage.getItem(LOCAL_KEY).catch(() => null);
  const left: AppState = raw ? JSON.parse(raw) : EMPTY;
  if (!left.wishes.length && !left.rooms.length) return false;
  // what the account already has isn't a guest's: never upload it a second time
  // (a copy of the account's rooms and wishes once ended up here and came back doubled)
  const acc = await api.state();
  const haveRooms = new Set((acc.rooms || []).map((r) => r.id));
  const haveWishes = new Set((acc.wishes || []).map((w) => w.id));
  left.rooms = left.rooms.filter((r) => !haveRooms.has(r.id));
  left.wishes = left.wishes.filter((w) => !haveWishes.has(w.id));
  if (!left.wishes.length && !left.rooms.length) {
    await AsyncStorage.removeItem(LOCAL_KEY);
    return false;
  }
  const save = () => AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(left));
  const ids: Record<string, string> = {};
  while (left.rooms.length) {
    const r = left.rooms[0];
    const res = await api.createRoom({ name: r.name, type: r.type, emoji: r.emoji, tint: r.tint, eventTitle: r.eventTitle, eventDate: r.eventDate, bdayMode: r.bdayMode, celebrantName: r.celebrantName, stickerPos: r.stickerPos });
    ids[r.id] = res.room.id;
    left.rooms.shift();
    left.wishes = left.wishes.map((w) => ({ ...w, rooms: w.rooms.map((x) => (x === r.id ? res.room.id : x)) }));
    await save();
  }
  // oldest first, so the newest ends up on top as before
  while (left.wishes.length) {
    const w = left.wishes[left.wishes.length - 1];
    const res = await api.createWish({ emoji: w.emoji, image: w.image, images: w.images, link: w.link, title: w.title, price: w.price, note: w.note, rooms: w.rooms.filter((x) => Object.values(ids).includes(x)) });
    if (w.giftedAt && res.wish) await api.setGifted(res.wish.id, true).catch(() => {});
    left.wishes.pop();
    await save();
  }
  await AsyncStorage.removeItem(LOCAL_KEY);
  return true;
}

export function WishpoolProvider({ children }: { children: React.ReactNode }) {
  const { status, user, updateUser } = useAuth();
  const { t } = useT();
  const synced = useRef<string | null>(null);
  const online = status === "signedIn" && api.configured();
  const [state, setState] = useState<AppState>(EMPTY);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // only a guest's things live on the phone: right after signing out the account's
  // rooms are still in memory for a moment, and they must not land here
  const persistLocal = useCallback(
    (s: AppState) => {
      if (status === "guest") AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(s)).catch(() => {});
    },
    [status],
  );

  const refresh = useCallback(async () => {
    if (!online) {
      const raw = await AsyncStorage.getItem(LOCAL_KEY).catch(() => null);
      setState(raw ? JSON.parse(raw) : EMPTY);
      return;
    }
    const s = await api.state();
    const next = { wishes: s.wishes || [], rooms: s.rooms || [] };
    setState(next);
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
  }, [online]);

  useEffect(() => {
    if (status === "loading") return;
    let live = true;
    setReady(false);
    // leaving the account: drop its rooms and wishes from memory at once
    if (!online) setState(EMPTY);
    (async () => {
      // show the last known server state at once, then refresh it
      if (online) {
        const cached = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
        if (cached && live) setState(JSON.parse(cached));
        if (user && synced.current !== user.id) {
          synced.current = user.id;
          await syncAccount().catch(() => {});
        }
      }
      await refresh().catch(() => {});
      if (live) setReady(true);
    })();
    return () => {
      live = false;
    };
  }, [status, user?.id, online, refresh]);

  // Once per sign-in: the guest's things move in, and the profile (name, photo,
  // birthday) set on this phone meets the one on the server.
  const syncAccount = async () => {
    if (await moveLocalToAccount().catch(() => false)) toast.info(t("movedToAccount"), { root: true });
    const p = getPrefs();
    if (!p.demo && (p.displayName || p.avatar)) {
      const res = await api.updateMe({ ...(p.displayName ? { name: p.displayName } : {}), ...(p.avatar ? { photo: p.avatar } : {}) }).catch(() => null);
      if (res) {
        setPref("displayName", null);
        setPref("avatar", null);
      }
    }
    const me = ((await api.state()) as { me?: ServerMe }).me;
    if (!me || !user) return;
    if (me.name !== user.name || (me.photo || null) !== (user.photo || null)) await updateUser({ ...user, name: me.name, photo: me.photo || null });
    if (me.birthday && me.birthday !== p.birthday) setPref("birthday", me.birthday);
    else if (!me.birthday && p.birthday) await api.setBirthday(p.birthday).catch(() => {});
  };

  // Local mode: apply the change to the in-memory state and save it.
  const local = useCallback(
    (fn: (s: AppState) => AppState) => {
      const next = fn(stateRef.current);
      setState(next);
      persistLocal(next);
    },
    [persistLocal],
  );

  const addWish = useCallback(
    async (w: NewWish) => {
      if (online) {
        await api.createWish(w);
        await refresh();
      } else local((s) => ({ ...s, wishes: [{ ...w, id: uid("w"), giftedAt: null }, ...s.wishes] }));
    },
    [online, refresh, local],
  );

  const updateWish = useCallback(
    async (id: string, w: Partial<NewWish>) => {
      if (online) {
        await api.updateWish(id, w);
        await refresh();
      } else local((s) => ({ ...s, wishes: s.wishes.map((x) => (x.id === id ? { ...x, ...w } : x)) }));
    },
    [online, refresh, local],
  );

  const deleteWish = useCallback(
    async (id: string) => {
      local((s) => ({ ...s, wishes: s.wishes.filter((x) => x.id !== id) }));
      if (online) await api.deleteWish(id).finally(refresh);
    },
    [online, refresh, local],
  );

  const setGifted = useCallback(
    async (id: string, gifted: boolean) => {
      local((s) => ({ ...s, wishes: s.wishes.map((x) => (x.id === id ? { ...x, giftedAt: gifted ? Date.now() : null, rooms: gifted ? [] : x.rooms } : x)) }));
      if (online) await api.setGifted(id, gifted).finally(refresh);
    },
    [online, refresh, local],
  );

  const toggleWishRoom = useCallback(
    async (id: string, roomId: string) => {
      local((s) => ({
        ...s,
        wishes: s.wishes.map((x) => (x.id !== id ? x : { ...x, rooms: x.rooms.includes(roomId) ? x.rooms.filter((r) => r !== roomId) : [...x.rooms, roomId] })),
      }));
      if (online) await api.toggleWishRoom(id, roomId).catch(refresh);
    },
    [online, refresh, local],
  );

  const createRoom = useCallback<WishpoolValue["createRoom"]>(
    async (r) => {
      if (online) {
        const res = await api.createRoom(r);
        await refresh();
        return res.room.id;
      }
      const id = uid("r");
      const me = { id: "me", name: user?.name || "You", color: "#7B61FF" };
      local((s) => ({ ...s, rooms: [...s.rooms, { members: [me], ...r, id }] }));
      return id;
    },
    [online, refresh, local, user?.name],
  );

  const updateRoom = useCallback(
    async (id: string, r: Partial<Room>) => {
      if (online) {
        await api.updateRoom(id, r);
        await refresh();
      } else local((s) => ({ ...s, rooms: s.rooms.map((x) => (x.id === id ? { ...x, ...r } : x)) }));
    },
    [online, refresh, local],
  );

  const removeRoom = useCallback(
    async (id: string, asOwner: boolean) => {
      local((s) => ({ rooms: s.rooms.filter((r) => r.id !== id), wishes: s.wishes.map((w) => ({ ...w, rooms: w.rooms.filter((r) => r !== id) })) }));
      if (online) await (asOwner ? api.deleteRoom(id) : api.leaveRoom(id)).finally(refresh);
    },
    [online, refresh, local],
  );

  const value = useMemo<WishpoolValue>(
    () => ({ ...state, ready, online, refresh, addWish, updateWish, deleteWish, setGifted, toggleWishRoom, createRoom, updateRoom, removeRoom }),
    [state, ready, online, refresh, addWish, updateWish, deleteWish, setGifted, toggleWishRoom, createRoom, updateRoom, removeRoom],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWishpool(): WishpoolValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWishpool must be used inside <WishpoolProvider>");
  return v;
}

export const wishImages = (w: Pick<Wish, "images" | "image"> | null | undefined): string[] =>
  w && w.images && w.images.length ? w.images : w && w.image ? [w.image] : [];
