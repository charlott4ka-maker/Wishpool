// Cards per row in the wish and room grids: 2 on a phone, 3 on a wide screen
// (the iPhone Duo's inner display is ~626pt wide; the app doesn't run on iPad).
import { useWindowDimensions } from "react-native";

export function useGridColumns() {
  const { width } = useWindowDimensions();
  return width >= 560 ? 3 : 2;
}
