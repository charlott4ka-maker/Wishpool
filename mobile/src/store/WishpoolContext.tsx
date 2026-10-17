// Wishes and rooms for the whole app. Signed in: the Wishpool backend (the
// same data as in Telegram). Guest: kept on the phone only, like the Mini App
// outside Telegram, so the app can be tried before signing in.

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { api } from "../services/api";
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

export function WishpoolProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const online = status === "signedIn" && api.configured();
  const [state, setState] = useState<AppState>(EMPTY);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const persistLocal = useCallback((s: AppState) => {
    AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(s)).catch(() => {});
  }, []);

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
    (async () => {
      // show the last known server state at once, then refresh it
      if (online) {
        const cached = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
        if (cached && live) setState(JSON.parse(cached));
      }
      await refresh().catch(() => {});
      if (live) setReady(true);
    })();
    return () => {
      live = false;
    };
  }, [status, user?.id, online, refresh]);

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
