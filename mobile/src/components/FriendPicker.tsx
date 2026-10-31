// Pick friends to bring into a room: chips with their avatar, tap to toggle.
// Used when making a room and from a room's ⋯ › Add friends. Loads the friend
// list itself; signed-in only (a guest has no friends on the server).

import { Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { haptic } from "../lib/haptics";
import { api } from "../services/api";
import { C } from "../theme/tokens";
import type { Member } from "../types";
import { Press } from "./Press";
import { Avatar, Txt } from "./ui";

export function useFriendList(enabled: boolean) {
  const [friends, setFriends] = useState<Member[] | null>(enabled ? null : []);
  useEffect(() => {
    if (!enabled) return;
    api.friends().then((d) => setFriends(d.friends)).catch(() => setFriends([]));
  }, [enabled]);
  return friends;
}

export function FriendPicker({ friends, selected, onToggle, exclude = [] }: { friends: Member[] | null; selected: string[]; onToggle: (id: string) => void; exclude?: string[] }) {
  if (!friends) return <ActivityIndicator color={C.t2} style={{ alignSelf: "flex-start", marginVertical: 8 }} />;
  const list = friends.filter((f) => !exclude.includes(f.id));
  return (
    <View className="flex-row flex-wrap gap-2">
      {list.map((f) => {
        const on = selected.includes(f.id);
        return (
          <Press
            key={f.id}
            onPress={() => {
              haptic("select");
              onToggle(f.id);
            }}
            className={`h-sm flex-row items-center gap-2 rounded-full pl-1 pr-4 ${on ? "bg-blueSoft" : "bg-transparent"}`}
            style={{ borderWidth: 1, borderColor: on ? C.blueLine : C.line }}
          >
            {on ? (
              <View className="items-center justify-center rounded-full bg-blue" style={{ width: 30, height: 30 }}>
                <Check size={16} color="#fff" strokeWidth={1.5} absoluteStrokeWidth />
              </View>
            ) : (
              <Avatar m={f} size={30} />
            )}
            <Txt numberOfLines={1} className={`font-m600 text-sm ${on ? "text-blueText" : "text-t2"}`} style={{ maxWidth: 160 }}>{f.name}</Txt>
          </Press>
        );
      })}
    </View>
  );
}
