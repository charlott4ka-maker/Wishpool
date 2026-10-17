import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/** Height of the on-screen keyboard, 0 while it is hidden. */
export function useKeyboardHeight(): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === "ios";
    const show = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", (e) => setH(e.endCoordinates.height));
    const hide = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () => setH(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return h;
}
