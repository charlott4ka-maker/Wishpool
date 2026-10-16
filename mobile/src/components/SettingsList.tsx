// iOS Settings-style list: grouped rows with a coloured icon tile, the label,
// then a value, a switch or a chevron. The separator between rows starts at
// the label, not at the icon, like in iOS.

import { ChevronRight, LucideIcon } from "lucide-react-native";
import React from "react";
import { Pressable, Switch, View } from "react-native";

import { haptic } from "../lib/haptics";
import { C } from "../theme/tokens";
import { Txt } from "./ui";

const PAD = 16;
const TILE = 30;
const GAP = 12;
const ROW = 52;

export function SettingsGroup({ title, footer, children }: { title?: string; footer?: string; children: React.ReactNode }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View className="mb-6">
      {title ? <Txt className="mb-2 px-4 font-m600 text-[13px] uppercase text-t2" style={{ letterSpacing: 0.4 }}>{title}</Txt> : null}
      <View className="overflow-hidden rounded-card bg-card">
        {rows.map((row, i) => (
          <View key={i}>
            {row}
            {i < rows.length - 1 ? <View style={{ height: 0.5, backgroundColor: "rgba(255,255,255,0.12)", marginLeft: PAD + TILE + GAP }} /> : null}
          </View>
        ))}
      </View>
      {footer ? <Txt className="mt-2 px-4 text-[12.5px] leading-[17px] text-t3">{footer}</Txt> : null}
    </View>
  );
}

type CellProps = {
  icon: LucideIcon;
  /** Tile colour, as in iOS Settings. */
  tint: string;
  label: string;
  value?: string;
  onPress?: () => void;
  /** Shows a switch instead of the chevron. */
  toggle?: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean };
  /** Red label, no chevron (sign out, delete). */
  destructive?: boolean;
  chevron?: boolean;
};

export function SettingsCell({ icon: Icon, tint, label, value, onPress, toggle, destructive, chevron = !toggle && !destructive }: CellProps) {
  const body = (
    <View className="flex-row items-center" style={{ height: ROW, paddingLeft: PAD, paddingRight: PAD - 4 }}>
      <View className="items-center justify-center" style={{ width: TILE, height: TILE, borderRadius: 8, backgroundColor: tint, marginRight: GAP }}>
        <Icon size={18} color="#fff" strokeWidth={2.2} />
      </View>
      <Txt numberOfLines={1} className={`flex-1 text-base ${destructive ? "text-danger" : ""}`}>{label}</Txt>
      {value ? <Txt numberOfLines={1} className="ml-2 text-base text-t2">{value}</Txt> : null}
      {toggle ? (
        <Switch
          value={toggle.value}
          disabled={toggle.disabled}
          onValueChange={(v) => {
            haptic("select");
            toggle.onChange(v);
          }}
          trackColor={{ true: C.green, false: "#39393D" }}
          ios_backgroundColor="#39393D"
        />
      ) : null}
      {chevron ? <ChevronRight size={20} color={C.t3} style={{ marginLeft: 4 }} /> : null}
    </View>
  );
  if (!onPress || toggle) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: pressed ? "rgba(255,255,255,0.06)" : "transparent" })}>
      {body}
    </Pressable>
  );
}
