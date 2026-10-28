// The friend's wish the room screen hands to its sheet (app/room/wish.tsx):
// the room already has it, with its reservation state, so no second request.
import type { Wish } from "../types";

export type RoomWish = Wish & { reservedByMe?: boolean; taken?: boolean; chips?: { count: number; mine: boolean; total: number } | null };
export const openedWish: { w: RoomWish | null; roomId: string } = { w: null, roomId: "" };
