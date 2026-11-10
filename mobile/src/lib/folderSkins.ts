// Premium folder looks: the back and the front of the folder as pictures (made
// with GPT from our folder silhouette, design/folders), with the wish photos
// tucked in between. The server keeps a room's look as `skin` (FOLDER_SKINS in
// server/util.js lists the same ids).

export type FolderSkin = { id: string; back: number; front: number };

export const FOLDER_SKINS: FolderSkin[] = [
  { id: "suede", back: require("../../assets/folders/suede_back.webp"), front: require("../../assets/folders/suede_front.webp") },
  { id: "fawn", back: require("../../assets/folders/fawn_back.webp"), front: require("../../assets/folders/fawn_front.webp") },
  { id: "pinkleo", back: require("../../assets/folders/pinkleo_back.webp"), front: require("../../assets/folders/pinkleo_front.webp") },
  { id: "croc", back: require("../../assets/folders/croc_back.webp"), front: require("../../assets/folders/croc_front.webp") },
  { id: "knit", back: require("../../assets/folders/knit_back.webp"), front: require("../../assets/folders/knit_front.webp") },
  { id: "puffer", back: require("../../assets/folders/puffer_back.webp"), front: require("../../assets/folders/puffer_front.webp") },
  { id: "cow", back: require("../../assets/folders/cow_back.webp"), front: require("../../assets/folders/cow_front.webp") },
  { id: "airmail", back: require("../../assets/folders/airmail_back.webp"), front: require("../../assets/folders/airmail_front.webp") },
  { id: "frog", back: require("../../assets/folders/frog_back.webp"), front: require("../../assets/folders/frog_front.webp") },
  { id: "chrome", back: require("../../assets/folders/chrome_back.webp"), front: require("../../assets/folders/chrome_front.webp") },
  { id: "giftwrap", back: require("../../assets/folders/giftwrap_back.webp"), front: require("../../assets/folders/giftwrap_front.webp") },
  { id: "gummy", back: require("../../assets/folders/gummy_back.webp"), front: require("../../assets/folders/gummy_front.webp") },
  { id: "xmas", back: require("../../assets/folders/xmas_back.webp"), front: require("../../assets/folders/xmas_front.webp") },
  { id: "violet", back: require("../../assets/folders/violet_back.webp"), front: require("../../assets/folders/violet_front.webp") },
  { id: "web", back: require("../../assets/folders/web_back.webp"), front: require("../../assets/folders/web_front.webp") },
  { id: "wishful", back: require("../../assets/folders/wishful_back.webp"), front: require("../../assets/folders/wishful_front.webp") },
  { id: "cyano", back: require("../../assets/folders/cyano_back.webp"), front: require("../../assets/folders/cyano_front.webp") },
  { id: "stripes", back: require("../../assets/folders/stripes_back.webp"), front: require("../../assets/folders/stripes_front.webp") },
  { id: "sky", back: require("../../assets/folders/sky_back.webp"), front: require("../../assets/folders/sky_front.webp") },
];

export const folderSkin = (id?: string) => (id ? FOLDER_SKINS.find((s) => s.id === id) : undefined);
