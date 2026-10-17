// iOS Settings-style list: grouped rows with a coloured icon tile, the label,
// then a value, a switch or a chevron. The separator between rows starts at
// the label, not at the icon, like in iOS.

import { ChevronRight, LucideIcon } from "lucide-react-native";
import React from "react";
import { Pressable, Switch, View } from "react-native";

import { haptic } from "../lib/haptics";
import { C } from "../theme/tokens";
import { BLOCK_GAP, BLOCK_R } from "./TabHeader";
import { Txt } from "./ui";

const PAD = 16;
const TILE = 32;
const GAP = 16;
const ROW = 60;

export function SettingsGroup({ title, footer, children }: { title?: string; footer?: string; children: React.ReactNode }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    // one block per group (block layout: 4pt gaps), title and footer inside it
    <View style={{ marginTop: BLOCK_GAP, backgroundColor: C.card, borderRadius: BLOCK_R, overflow: "hidden", paddingTop: title ? 16 : 4, paddingBottom: footer ? 16 : 4 }}>
      {title ? <Txt className="mb-1 px-4 font-m600 text-[13px] uppercase text-t2" style={{ letterSpacing: 0.4 }}>{title}</Txt> : null}
      <View>
        {rows.map((row, i) => (
          <View key={i}>
            {row}
            {i < rows.length - 1 ? <View style={{ height: 0.5, backgroundColor: "rgba(255,255,255,0.12)", marginLeft: PAD + TILE + GAP }} /> : null}
          </View>
        ))}
      </View>
      {footer ? <Txt className="mt-1 px-4 text-[12.5px] leading-[18px] text-t3">{footer}</Txt> : null}
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
  /** Anything else on the right (e.g. a date picker). */
  right?: React.ReactNode;
};

export function SettingsCell({ icon: Icon, tint, label, value, onPress, toggle, destructive, right, chevron = !toggle && !destructive && !right }: CellProps) {
  const body = (
    <View className="flex-row" style={{ height: ROW, alignItems: "center", paddingLeft: PAD, paddingRight: PAD }}>
      <View className="items-center justify-center" style={{ width: TILE, height: TILE, borderRadius: 9, backgroundColor: tint, marginRight: GAP }}>
        <Icon size={19} color="#fff" strokeWidth={2.2} />
      </View>
      <Txt numberOfLines={1} className={`flex-1 text-base ${destructive ? "text-danger" : ""}`}>{label}</Txt>
      {value ? <Txt numberOfLines={1} className="ml-2 text-base text-t2">{value}</Txt> : null}
      {right}
      {toggle ? (
        <View style={{ height: ROW, justifyContent: "center", alignItems: "flex-end", marginLeft: 8 }}>
        <Switch
          value={toggle.value}
          disabled={toggle.disabled}
          onValueChange={(v) => {
            haptic("select");
            toggle.onChange(v);
          }}
          trackColor={{ true: C.green, false: "#39393D" }}
          ios_backgroundColor="#39393D"
          style={{ alignSelf: "center" }}
        />
        </View>
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
