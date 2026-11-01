// Demo content for the App Review account (REVIEW_EMAIL): the same sample
// wishlist, rooms and friends the app's local demo shows, but real on the
// server, so App Review and the store screenshots see a lived-in account.
// POST /review-demo {lang} wipes the account's wishes and rooms and fills them
// again in that language. Only the review account may call it. The friends are
// fixed demo users ("demo_max", ...), recreated on every fill.

const pick = (lang, v) => v[lang] || v.en;

const day = (offset) => {
  const d = new Date(Date.now() + offset * 864e5);
  return d.toISOString().slice(0, 10);
};

export function reviewDemoRoutes(api, store) {
  api.post("/review-demo", async (req, res, next) => {
    try {
      const me = req.user.id;
      const review = (process.env.REVIEW_EMAIL || "").toLowerCase();
      if (!review || !(await store.userEmails(me)).includes(review)) return res.status(403).json({ error: "forbidden" });
      const lang = ["uk", "ru", "en"].includes(req.body && req.body.lang) ? req.body.lang : "en";
      await fillReviewDemo(store, me, lang);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
}

export async function fillReviewDemo(store, me, lang) {
  const p = (v) => pick(lang, v);
  const price = (uah, usd) => (lang === "en" ? usd : uah);
  const now = Date.now();
  let n = 0;
  const id = (k) => `demo_${k}_${now.toString(36)}`;

  // start clean: my rooms and wishes, then the demo friends themselves
  for (const rid of await store.userRoomIds(me)) {
    const r = await store.getRoom(rid);
    if (r && r.ownerId === me) await store.deleteRoom(rid);
    else await store.removeMember(rid, me);
  }
  for (const w of await store.userWishes(me)) await store.deleteWish(w.id);
  const people = {
    max: { uk: "Макс", ru: "Макс", en: "Max" },
    kate: { uk: "Катя", ru: "Катя", en: "Kate" },
    oleg: { uk: "Олег", ru: "Олег", en: "Oleg" },
    lena: { uk: "Лєна", ru: "Лена", en: "Lena" },
    tom: { uk: "Тарас", ru: "Тарас", en: "Tom" },
  };
  const P = {};
  for (const [k, name] of Object.entries(people)) {
    P[k] = "demo_" + k;
    await store.deleteUser(P[k]);
    await store.ensureUser({ id: P[k], name: p(name), lang });
    await store.addFriends(me, P[k]);
  }

  await store.updateProfile(me, { name: p({ uk: "Аня", ru: "Аня", en: "Anna" }) });
  await store.setBirthday(me, day(29).replace(/^\d{4}/, "1998"));

  // rooms
  const room = async (key, r, members) => {
    const rid = id(key);
    await store.createRoom({ id: rid, ownerId: me, createdAt: now + n++, eventTitle: "", eventDate: "", bdayMode: "", celebrantName: "", celebrantId: null, stickerPos: "", ...r });
    for (const m of [me, ...members]) await store.addMember(rid, m);
    return rid;
  };
  const R = {
    friends: await room("friends", { name: p({ uk: "Друзі", ru: "Друзья", en: "Friends" }), type: "friends", emoji: "stk:uno", tint: "#0A82F9" }, [P.max, P.kate, P.oleg, P.lena]),
    max: await room("max", {
      name: p({ uk: "ДР Макса", ru: "ДР Макса", en: "Max's birthday" }), type: "birthday", emoji: "stk:cake", tint: "#34C759",
      eventDate: day(1), bdayMode: "other", celebrantName: p(people.max), celebrantId: P.max,
    }, [P.kate, P.oleg, P.lena, P.tom, P.max]),
    us: await room("us", { name: p({ uk: "Ми вдвох", ru: "Мы вдвоём", en: "Us two" }), type: "couple", emoji: "stk:ring", tint: "#FF4D8D" }, [P.oleg]),
    family: await room("family", { name: p({ uk: "Сімʼя", ru: "Семья", en: "Family" }), type: "friends", emoji: "stk:piggy", tint: "#FF7A45" }, [P.lena, P.tom]),
  };

  // wishes: oldest first, so the list reads top-down like the demo
  const wish = async (owner, emoji, title, pr, rooms, extra = {}) => {
    const wid = id("w" + n);
    await store.createWish({ id: wid, ownerId: owner, emoji, image: null, images: [], link: extra.link || null, title: p(title), price: pr, createdAt: now - n++ * 60000, note: extra.note ? p(extra.note) : "" });
    for (const rid of rooms) await store.addWishRoom(wid, R[rid]);
    if (extra.gifter) await store.setReservation(wid, extra.gifter);
    return wid;
  };

  // mine
  await wish(me, "stk:headphones", { uk: "Бездротові навушники", ru: "Беспроводные наушники", en: "Wireless headphones" }, price("4 200 ₴", "$99"), ["friends", "us"], {
    link: "https://rozetka.com.ua/ua/headphones/", note: { uk: "Чорні або білі, з шумодавом", ru: "Чёрные или белые, с шумоподавлением", en: "Black or white, with noise cancelling" },
  });
  await wish(me, "stk:plane", { uk: "Квитки до Барселони", ru: "Билеты в Барселону", en: "Trip to Barcelona" }, price("від 6 000 ₴", "from $150"), ["us"]);
  await wish(me, "stk:book", { uk: "Книга «Атомні звички»", ru: "Книга «Атомные привычки»", en: "Atomic Habits book" }, price("450 ₴", "$15"), ["friends", "family"], { link: "https://www.yakaboo.ua/" });
  await wish(me, "stk:matcha", { uk: "Набір для матчі", ru: "Набор для матчи", en: "Matcha set" }, price("1 300 ₴", "$35"), []);
  await wish(me, "stk:lipstick", { uk: "Помада Dior Addict", ru: "Помада Dior Addict", en: "Dior Addict lipstick" }, price("1 850 ₴", "$42"), ["friends"], {
    note: { uk: "Відтінок 720, нюдовий", ru: "Оттенок 720, нюдовый", en: "Shade 720, nude" },
  });
  await wish(me, "stk:picture", { uk: "Постер у спальню", ru: "Постер в спальню", en: "Bedroom poster" }, price("800 ₴", "$20"), []);
  await wish(me, "stk:candle", { uk: "Аромасвічка", ru: "Аромасвеча", en: "Scented candle" }, price("650 ₴", "$18"), ["family"]);
  await wish(me, "stk:gamepad", { uk: "Геймпад", ru: "Геймпад", en: "Game controller" }, price("2 400 ₴", "$60"), ["us"]);

  // friends' lists: some gifts I'm giving, some taken by someone else
  await wish(P.kate, "stk:flower", { uk: "Букет півоній", ru: "Букет пионов", en: "Peony bouquet" }, price("1 200 ₴", "$30"), ["friends"], { gifter: me });
  await wish(P.kate, "stk:coconut", { uk: "Кокосовий скраб", ru: "Кокосовый скраб", en: "Coconut body scrub" }, price("390 ₴", "$12"), ["friends"], { gifter: P.oleg });
  await wish(P.kate, "stk:orange", { uk: "Соковижималка", ru: "Соковыжималка", en: "Juicer" }, price("1 700 ₴", "$40"), ["friends"]);
  await wish(P.oleg, "stk:gamepad", { uk: "Підписка PS Plus", ru: "Подписка PS Plus", en: "PS Plus subscription" }, price("1 500 ₴", "$60"), ["friends"]);
  await wish(P.oleg, "stk:book", { uk: "Комікс Batman", ru: "Комикс Batman", en: "Batman comic" }, price("520 ₴", "$15"), ["friends"], { gifter: P.kate });
  await wish(P.max, "stk:headphones", { uk: "Навушники", ru: "Наушники", en: "Headphones" }, price("3 800 ₴", "$89"), ["max", "friends"], { gifter: me, note: { uk: "Сірі", ru: "Серые", en: "Grey ones" } });
  await wish(P.max, "stk:plane", { uk: "Сертифікат на політ", ru: "Сертификат на полёт", en: "Flight experience" }, price("2 500 ₴", "$70"), ["max"], { gifter: P.lena });
  await wish(P.max, "stk:shell", { uk: "Набір для дайвінгу", ru: "Набор для дайвинга", en: "Snorkel set" }, price("1 100 ₴", "$30"), ["max"]);
  await wish(P.oleg, "stk:ring", { uk: "Каблучка", ru: "Колечко", en: "A little ring" }, price("2 900 ₴", "$75"), ["us"]);
  await wish(P.oleg, "stk:cake", { uk: "Майстер-клас з випічки", ru: "Мастер-класс по выпечке", en: "Baking class" }, price("1 400 ₴", "$40"), ["us"], { gifter: me });
  await wish(P.lena, "stk:candle", { uk: "Свічки", ru: "Свечи", en: "Candles" }, price("500 ₴", "$14"), ["family"]);
  await wish(P.tom, "stk:piggy", { uk: "Скарбничка", ru: "Копилка", en: "Piggy bank" }, price("350 ₴", "$10"), ["family"], { gifter: P.lena });
}
