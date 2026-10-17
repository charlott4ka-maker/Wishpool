// Demo content for App Store screenshots (dev builds only, Settings › Demo):
// a filled wishlist, rooms with friends and their lists, a gift you're giving
// and one someone else took. Written to the guest's local state; the friends'
// lists live on the rooms (demoLists) since there's no server behind them.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { toISODate } from "../components/DateRow";
import type { Lang } from "../i18n";
import { setPref } from "../settings/prefs";
import type { AppState, Member, Room, Wish } from "../types";

const LOCAL_KEY = "wp_local_state";

type L = Record<Lang, string>;
const pick = (lang: Lang, v: L) => v[lang] || v.en;

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toISODate(d);
};

export async function fillDemo(lang: Lang) {
  const p = (v: L) => pick(lang, v);
  const me: Member = { id: "me", name: p({ uk: "Аня", ru: "Аня", en: "Anna" }), color: "#7B61FF" };
  const max: Member = { id: "max", name: p({ uk: "Макс", ru: "Макс", en: "Max" }), color: "#34C759" };
  const kate: Member = { id: "kate", name: p({ uk: "Катя", ru: "Катя", en: "Kate" }), color: "#FF4D8D" };
  const oleg: Member = { id: "oleg", name: p({ uk: "Олег", ru: "Олег", en: "Oleg" }), color: "#FF7A45" };
  const lena: Member = { id: "lena", name: p({ uk: "Лєна", ru: "Лена", en: "Lena" }), color: "#38BDF8" };
  const tom: Member = { id: "tom", name: p({ uk: "Тарас", ru: "Тарас", en: "Tom" }), color: "#AF52DE" };

  const uah = lang === "en";
  const price = (uahText: string, usd: string) => (uah ? usd : uahText);

  const w = (id: string, emoji: string, title: L, pr: string, rooms: string[], extra: Partial<Wish> = {}): Wish => ({
    id, emoji, title: p(title), price: pr, rooms, image: null, images: [], link: null, note: "", giftedAt: null, ...extra,
  });

  const rooms: Room[] = [
    { id: "r-friends", name: p({ uk: "Друзі", ru: "Друзья", en: "Friends" }), type: "friends", emoji: "stk:uno", tint: "#0A82F9", members: [me, max, kate, oleg, lena] },
    { id: "r-max", name: p({ uk: "ДР Макса", ru: "ДР Макса", en: "Max's birthday" }), type: "birthday", emoji: "stk:cake", tint: "#34C759", members: [me, kate, oleg, lena, tom], eventDate: day(1), eventTitle: "", bdayMode: "other", celebrantName: max.name },
    { id: "r-us", name: p({ uk: "Ми вдвох", ru: "Мы вдвоём", en: "Us two" }), type: "couple", emoji: "stk:ring", tint: "#FF4D8D", members: [me, oleg] },
    { id: "r-family", name: p({ uk: "Сімʼя", ru: "Семья", en: "Family" }), type: "friends", emoji: "stk:piggy", tint: "#FF7A45", members: [me, lena, tom] },
  ];

  const wishes: Wish[] = [
    w("w1", "stk:headphones", { uk: "Бездротові навушники", ru: "Беспроводные наушники", en: "Wireless headphones" }, price("4 200 ₴", "$99"), ["r-friends", "r-us"], {
      link: "https://rozetka.com.ua/ua/headphones/", note: p({ uk: "Чорні або білі, з шумодавом", ru: "Чёрные или белые, с шумоподавлением", en: "Black or white, with noise cancelling" }),
    }),
    w("w2", "stk:plane", { uk: "Квитки до Барселони", ru: "Билеты в Барселону", en: "Trip to Barcelona" }, price("від 6 000 ₴", "from $150"), ["r-us"]),
    w("w3", "stk:book", { uk: "Книга «Атомні звички»", ru: "Книга «Атомные привычки»", en: "Atomic Habits book" }, price("450 ₴", "$15"), ["r-friends", "r-family"], { link: "https://www.yakaboo.ua/" }),
    w("w4", "stk:matcha", { uk: "Набір для матчі", ru: "Набор для матчи", en: "Matcha set" }, price("1 300 ₴", "$35"), []),
    w("w5", "stk:lipstick", { uk: "Помада Dior Addict", ru: "Помада Dior Addict", en: "Dior Addict lipstick" }, price("1 850 ₴", "$42"), ["r-friends"], {
      note: p({ uk: "Відтінок 720, нюдовий", ru: "Оттенок 720, нюдовый", en: "Shade 720, nude" }),
    }),
    w("w6", "stk:picture", { uk: "Постер у спальню", ru: "Постер в спальню", en: "Bedroom poster" }, price("800 ₴", "$20"), []),
    w("w7", "stk:candle", { uk: "Аромасвічка", ru: "Аромасвеча", en: "Scented candle" }, price("650 ₴", "$18"), ["r-family"]),
    w("w8", "stk:gamepad", { uk: "Геймпад", ru: "Геймпад", en: "Game controller" }, price("2 400 ₴", "$60"), ["r-us"]),
  ];

  // friends' lists inside rooms: one gift you're giving, one taken by someone else
  type RW = Wish & { reservedByMe?: boolean; taken?: boolean };
  const fw = (id: string, emoji: string, title: L, pr: string, extra: Partial<RW> = {}): RW => ({ ...w(id, emoji, title, pr, [], extra), ...extra });
  const demoLists: Record<string, { member: Member; wishes: RW[] }[]> = {
    "r-friends": [
      { member: kate, wishes: [
        fw("k1", "stk:flower", { uk: "Букет півоній", ru: "Букет пионов", en: "Peony bouquet" }, price("1 200 ₴", "$30"), { reservedByMe: true }),
        fw("k2", "stk:coconut", { uk: "Кокосовий скраб", ru: "Кокосовый скраб", en: "Coconut body scrub" }, price("390 ₴", "$12"), { taken: true }),
        fw("k3", "stk:orange", { uk: "Соковижималка", ru: "Соковыжималка", en: "Juicer" }, price("1 700 ₴", "$40")),
      ] },
      { member: oleg, wishes: [
        fw("o1", "stk:gamepad", { uk: "Підписка PS Plus", ru: "Подписка PS Plus", en: "PS Plus subscription" }, price("1 500 ₴", "$60")),
        fw("o2", "stk:book", { uk: "Комікс Batman", ru: "Комикс Batman", en: "Batman comic" }, price("520 ₴", "$15"), { taken: true }),
      ] },
    ],
    "r-max": [
      { member: max, wishes: [
        fw("m1", "stk:headphones", { uk: "Навушники", ru: "Наушники", en: "Headphones" }, price("3 800 ₴", "$89"), { reservedByMe: true, note: p({ uk: "Сірі", ru: "Серые", en: "Grey ones" }) }),
        fw("m2", "stk:plane", { uk: "Сертифікат на політ", ru: "Сертификат на полёт", en: "Flight experience" }, price("2 500 ₴", "$70"), { taken: true }),
        fw("m3", "stk:shell", { uk: "Набір для дайвінгу", ru: "Набор для дайвинга", en: "Snorkel set" }, price("1 100 ₴", "$30")),
      ] },
    ],
    "r-us": [
      { member: oleg, wishes: [
        fw("u1", "stk:ring", { uk: "Каблучка", ru: "Колечко", en: "A little ring" }, price("2 900 ₴", "$75")),
        fw("u2", "stk:cake", { uk: "Майстер-клас з випічки", ru: "Мастер-класс по выпечке", en: "Baking class" }, price("1 400 ₴", "$40"), { reservedByMe: true }),
      ] },
    ],
    "r-family": [
      { member: lena, wishes: [fw("l1", "stk:candle", { uk: "Свічки", ru: "Свечи", en: "Candles" }, price("500 ₴", "$14"))] },
      { member: tom, wishes: [fw("t1", "stk:piggy", { uk: "Скарбничка", ru: "Копилка", en: "Piggy bank" }, price("350 ₴", "$10"), { taken: true })] },
    ],
  };
  const state: AppState = { wishes, rooms: rooms.map((r) => ({ ...r, demoLists: demoLists[r.id] })) };

  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  setPref("displayName", me.name);
  setPref("birthday", day(29).replace(/^\d{4}/, "1998"));
  setPref("demo", true);
}

export async function clearDemo() {
  await AsyncStorage.removeItem(LOCAL_KEY);
  setPref("displayName", null);
  setPref("demo", false);
}
