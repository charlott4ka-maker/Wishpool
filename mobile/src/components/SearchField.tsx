import { Search, X } from "lucide-react-native";
import { useRef } from "react";
import { Keyboard, Pressable, TextInput, View } from "react-native";

import { C } from "../theme/tokens";

/**
 * Search pill. The × inside it on the right shows while there's text or the
 * search is active, and does both jobs: clears the text and closes the search
 * (keyboard down, the title comes back).
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
    <View className="mb-3 h-sm flex-row items-center gap-2 rounded-full bg-card2 px-4">
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
      {value || active ? (
        <Pressable onPress={close} hitSlop={8} accessibilityLabel="Clear">
          <X size={16} color={C.t2} />
        </Pressable>
      ) : null}
    </View>
  );
}
