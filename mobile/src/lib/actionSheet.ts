// A short list of actions: the iOS action sheet, an alert elsewhere.
import { ActionSheetIOS, Alert, Platform } from "react-native";

export function actionSheet(title: string, cancel: string, actions: [string, () => void][], destructive?: number) {
  const options = [...actions.map((a) => a[0]), cancel];
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options, destructiveButtonIndex: destructive, cancelButtonIndex: actions.length, userInterfaceStyle: "dark" },
      (i) => i < actions.length && actions[i][1](),
    );
  } else {
    Alert.alert(title, "", [...actions.map(([text, onPress]) => ({ text, onPress })), { text: cancel, style: "cancel" as const }]);
  }
}
