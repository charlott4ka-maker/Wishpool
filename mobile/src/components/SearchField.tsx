import { Search, X } from "lucide-react-native";
import { useRef } from "react";
import { Keyboard, Pressable, TextInput, View } from "react-native";

import { C } from "../theme/tokens";
import { GlassCircle } from "./ui";

/**
 * Search pill. Inside it, × clears the text. While the search is open a round
 * glass × sits next to it, as tall as the field: that's the only way out of
 * search (the tab bar is hidden meanwhile), like search in Apple's apps.
 */
export function SearchField({ value, onChangeText, placeholder, active, onFocusChange }: { value: string; onChangeText: (v: string) => void; placeholder: string; active?: boolean; onFocusChange?: (on: boolean) => void }) {
  const input = useRef<TextInput>(null);
  const close = () => {
    onChangeText("");
    input.current?.blur();
    Keyboard.dismiss();
    onFocusChange?.(false);
  };
  return (
    <View className="mb-3 flex-row items-center gap-2">
      <View className="h-sm flex-1 flex-row items-center gap-2 rounded-full bg-card2 px-4">
        <Search size={17} color={C.t3} />
        <TextInput
          ref={input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.t3}
          returnKeyType="search"
          clearButtonMode="never"
          className="flex-1 font-m500 text-[16px] text-t1"
          style={{ height: 40, paddingVertical: 0 }}
          onFocus={() => onFocusChange?.(true)}
        />
        {value ? (
          <Pressable onPress={() => onChangeText("")} hitSlop={8} accessibilityLabel="Clear">
            <X size={16} color={C.t2} />
          </Pressable>
        ) : null}
      </View>
      {active ? (
        <GlassCircle onPress={close} label="Close search">
          <X size={18} color={C.t1} />
        </GlassCircle>
      ) : null}
    </View>
  );
}
