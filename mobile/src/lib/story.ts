// Whether this build can make the stories picture (view-shot) and share it
// (expo-sharing): both are native, so only on iPhone builds that include them.
import { requireOptionalNativeModule } from "expo";
import { NativeModules, Platform } from "react-native";

export const storyAvailable = Platform.OS === "ios" && !!NativeModules.RNViewShot && !!requireOptionalNativeModule("ExpoSharing");
