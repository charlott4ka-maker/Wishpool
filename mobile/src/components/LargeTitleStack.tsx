// Stack for the Wishes and Rooms tabs (room for pushed screens later). No
// native bar: the screens draw our own 26pt title with a round "+" next to it,
// the same size as in the Mini App (the iOS 34pt large title was too big).

import { Stack } from "expo-router";

import { C } from "../theme/tokens";

export function LargeTitleStack() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />;
}
