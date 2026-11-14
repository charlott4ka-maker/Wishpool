// What Premium gives, in one place: the Premium page lists them with a line
// each, the paywall as short rows.
import { Folder, ImagePlus, LayoutGrid, type LucideIcon, Palette, Smartphone, Sticker, Wallpaper } from "lucide-react-native";

export const PERKS: { icon: LucideIcon; tint: string; title: string; sub: string }[] = [
  { icon: Folder, tint: "#0A82F9", title: "perkFolders", sub: "perkFoldersSub" },
  { icon: ImagePlus, tint: "#FF4D8D", title: "perkCover", sub: "perkCoverSub" },
  { icon: Sticker, tint: "#FF9500", title: "perkStickers", sub: "perkStickersSub" },
  { icon: Wallpaper, tint: "#5856D6", title: "perkRoomBg", sub: "perkRoomBgSub" },
  { icon: Palette, tint: "#AF52DE", title: "perkAccent", sub: "perkAccentSub" },
  { icon: Smartphone, tint: "#34C759", title: "perkIcon", sub: "perkIconSub" },
  { icon: LayoutGrid, tint: "#FF3B30", title: "perkWidgets", sub: "perkWidgetsSub" },
];
