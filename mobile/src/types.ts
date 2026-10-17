// Shapes returned by the Wishpool backend (server/app.js), shared with the web app.

export type Member = {
  id: string;
  name: string;
  color: string;
  photo?: string | null;
};

export type Wish = {
  id: string;
  /** "stk:<name>" sticker id (older wishes may hold a plain emoji). */
  emoji: string;
  image: string | null;
  images: string[];
  link: string | null;
  title: string;
  price: string;
  note: string;
  giftedAt: number | null;
  /** Room ids the wish is shared to; empty = private. */
  rooms: string[];
};

export type RoomType = "friends" | "couple" | "birthday";

export type Room = {
  id: string;
  name: string;
  type: RoomType;
  emoji: string;
  tint: string;
  members: Member[];
  eventTitle?: string;
  eventDate?: string;
  iAmCelebrant?: boolean;
  /** birthday rooms: whose birthday it is, and the celebrant's name when it's someone else's */
  bdayMode?: "self" | "other";
  celebrantName?: string;
  sharedCount?: number;
};

export type AppState = {
  wishes: Wish[];
  rooms: Room[];
};

export type NewWish = Omit<Wish, "id" | "giftedAt"> & { rooms: string[] };
