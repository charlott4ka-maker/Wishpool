import { Search, X } from "lucide-react-native";
import { Pressable, TextInput, View } from "react-native";

import { C } from "../theme/tokens";

export function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <View className="mb-4 h-sm flex-row items-center gap-2 rounded-full bg-card px-4">
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
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={8}>
          <X size={16} color={C.t2} />
        </Pressable>
      ) : null}
    </View>
  );
}
