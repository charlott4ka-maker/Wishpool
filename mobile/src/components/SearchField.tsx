import { Search, X } from "lucide-react-native";
import { useRef } from "react";
import { Keyboard, Pressable, TextInput, View } from "react-native";

import { C } from "../theme/tokens";
import { Txt } from "./ui";

/** With `onFocusChange`/`cancelLabel`: an iOS-style "Cancel" shows while the field is active. */
export function SearchField({ value, onChangeText, placeholder, active, onFocusChange, cancelLabel }: { value: string; onChangeText: (v: string) => void; placeholder: string; active?: boolean; onFocusChange?: (on: boolean) => void; cancelLabel?: string }) {
  const input = useRef<TextInput>(null);
  return (
    <View className="mb-3 flex-row items-center gap-3">
    <View className="h-sm flex-1 flex-row items-center gap-2 rounded-full bg-card2 px-4">
      <Search size={17} color={C.t3} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.t3}
        returnKeyType="search"
        clearButtonMode="never"
        className="flex-1 font-m500 text-[16px] text-t1"
        style={{ height: 40, paddingVertical: 0 }}
        onFocus={() => onFocusChange?.(true)}
        ref={input}
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={8}>
          <X size={16} color={C.t2} />
        </Pressable>
      ) : null}
    </View>
      {active && cancelLabel ? (
        <Pressable
          onPress={() => {
            onChangeText("");
            input.current?.blur();
            Keyboard.dismiss();
            onFocusChange?.(false);
          }}
          hitSlop={8}
        >
          <Txt className="font-m600 text-[16px] text-blue">{cancelLabel}</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
