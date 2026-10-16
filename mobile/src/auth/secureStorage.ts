// Keychain on iOS (SecureStore); AsyncStorage on web, where SecureStore doesn't exist.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const web = Platform.OS === "web";

export const secureStorage = {
  get: (k: string) => (web ? AsyncStorage.getItem(k) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) => (web ? AsyncStorage.setItem(k, v) : SecureStore.setItemAsync(k, v)),
  remove: (k: string) => (web ? AsyncStorage.removeItem(k) : SecureStore.deleteItemAsync(k)),
};
