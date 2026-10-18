// Questions and answers (Settings › FAQ): a list of questions that open in
// place, laid out like Settings, with a way to write to support at the end.

import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { ChevronDown, ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import { LayoutAnimation, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCircle, Pill, Txt } from "../components/ui";
import { useT, type Lang } from "../i18n";
import { haptic } from "../lib/haptics";
import { SUPPORT_EMAIL, writeSupport } from "../lib/support";
import { C } from "../theme/tokens";

type L = Record<Lang, string>;

// No em/en dashes in UI copy.
const FAQ: { q: L; a: L }[] = [
  {
    q: { uk: "Як додати бажання?", ru: "Как добавить желание?", en: "How do I add a wish?" },
    a: {
      uk: "На вкладці «Бажання» натисни «+». Встав посилання на товар, і ми самі підтягнемо назву, фото й ціну. Ще можна поділитися посиланням із Safari чи застосунку магазину: «Поділитися» › Wishpool.",
      ru: "На вкладке «Желания» нажми «+». Вставь ссылку на товар, и мы сами подтянем название, фото и цену. Ещё можно поделиться ссылкой из Safari или приложения магазина: «Поделиться» › Wishpool.",
      en: "On the Wishes tab tap «+». Paste a product link and we fill in the name, photo and price. You can also share a link from Safari or a shop app: Share › Wishpool.",
    },
  },
  {
    q: { uk: "Що таке кімнати?", ru: "Что такое комнаты?", en: "What are rooms?" },
    a: {
      uk: "Кімната це твоє коло людей: друзі, пара чи день народження. Ти обираєш, які бажання видно в кожній кімнаті, решта лишаються тільки твоїми.",
      ru: "Комната это твой круг людей: друзья, пара или день рождения. Ты выбираешь, какие желания видны в каждой комнате, остальные остаются только твоими.",
      en: "A room is your circle: friends, a couple or a birthday. You choose which wishes each room sees, the rest stay yours alone.",
    },
  },
  {
    q: { uk: "Як запросити друзів?", ru: "Как пригласить друзей?", en: "How do I invite friends?" },
    a: {
      uk: "Відкрий кімнату і натисни «Запросити». Друзі із застосунком потраплять одразу в кімнату, решта відкриє її в Telegram.",
      ru: "Открой комнату и нажми «Пригласить». Друзья с приложением попадут сразу в комнату, остальные откроют её в Telegram.",
      en: "Open a room and tap Invite. Friends with the app land right in the room, everyone else opens it in Telegram.",
    },
  },
  {
    q: { uk: "Чи побачить людина, що я їй дарую?", ru: "Увидит ли человек, что я ему дарю?", en: "Will they see what I'm giving them?" },
    a: {
      uk: "Ні. Хто що бере, власник бажання не бачить, тож сюрприз зберігається. А інші бачать, що подарунок уже зайнятий, і не куплять його вдруге.",
      ru: "Нет. Кто что берёт, владелец желания не видит, так что сюрприз сохраняется. А остальные видят, что подарок уже занят, и не купят его второй раз.",
      en: "No. The wish's owner never sees who takes what, so the surprise stays. Everyone else sees the gift is taken, so nobody buys it twice.",
    },
  },
  {
    q: { uk: "Як працює кімната дня народження?", ru: "Как работает комната дня рождения?", en: "How does a birthday room work?" },
    a: {
      uk: "Її можна зробити для себе або як сюрприз для друга. Іменинник бачить тільки свої бажання, а ідеї подарунків і хто що дарує від нього приховані.",
      ru: "Её можно сделать для себя или как сюрприз для друга. Именинник видит только свои желания, а идеи подарков и кто что дарит от него скрыты.",
      en: "Make one for yourself or as a surprise for a friend. The birthday person sees only their own wishes; gift ideas and who gives what stay hidden from them.",
    },
  },
  {
    q: { uk: "Чи потрібен акаунт?", ru: "Нужен ли аккаунт?", en: "Do I need an account?" },
    a: {
      uk: "Ні, можна і без нього: усе зберігається на телефоні. Увійди через Apple або пошту, щоб бути в кімнатах із друзями і не втратити бажання. Те, що вже є на телефоні, перенесеться в акаунт.",
      ru: "Нет, можно и без него: всё хранится на телефоне. Войди через Apple или почту, чтобы быть в комнатах с друзьями и не потерять желания. То, что уже есть на телефоне, перенесётся в аккаунт.",
      en: "No, the app works without one: everything stays on your phone. Sign in with Apple or e-mail to share rooms with friends and keep your wishes safe. What's already on the phone moves into the account.",
    },
  },
  {
    q: { uk: "Як отримувати нагадування про дні народження?", ru: "Как получать напоминания о днях рождения?", en: "How do birthday reminders work?" },
    a: {
      uk: "Вкажи свій день народження в профілі, і друзі з твоїх кімнат отримають нагадування за тиждень і за день. Щоб нагадування приходили тобі, увімкни сповіщення в Налаштуваннях.",
      ru: "Укажи свой день рождения в профиле, и друзья из твоих комнат получат напоминание за неделю и за день. Чтобы напоминания приходили тебе, включи уведомления в Настройках.",
      en: "Add your birthday on the profile and friends in your rooms get a reminder a week and a day before. To get reminders yourself, turn on notifications in Settings.",
    },
  },
  {
    q: { uk: "Як видалити акаунт?", ru: "Как удалить аккаунт?", en: "How do I delete my account?" },
    a: {
      uk: "Налаштування › Видалити акаунт. Акаунт, бажання і фото видаляються одразу, а твої кімнати переходять до інших учасників.",
      ru: "Настройки › Удалить аккаунт. Аккаунт, желания и фото удаляются сразу, а твои комнаты переходят к другим участникам.",
      en: "Settings › Delete account. Your account, wishes and photos are deleted at once; rooms you made pass to the other members.",
    },
  },
];

function Item({ q, a, open, onToggle, last }: { q: string; a: string; open: boolean; onToggle: () => void; last: boolean }) {
  return (
    <View>
      <Pressable onPress={onToggle} className="flex-row items-center gap-3 px-4 py-4" accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Txt className="flex-1 font-m600 text-base">{q}</Txt>
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
          <ChevronDown size={18} color={C.t2} />
        </View>
      </Pressable>
      {open ? <Txt className="-mt-1 px-4 pb-4 text-[14.5px] leading-[21px] text-t2">{a}</Txt> : null}
      {!last ? <View style={{ height: 0.5, backgroundColor: "rgba(255,255,255,0.12)", marginLeft: 16 }} /> : null}
    </View>
  );
}

export default function FaqScreen() {
  const { t, lang } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<number | null>(null);
  const toggle = (i: number) => {
    haptic("select");
    LayoutAnimation.configureNext(LayoutAnimation.create(220, "easeInEaseOut", "opacity"));
    setOpen((cur) => (cur === i ? null : i));
  };

  return (
    <View className="flex-1 bg-card">
      <View className="flex-row items-center px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <GlassCircle onPress={() => router.back()} label={t("back")}>
          <SymbolView name="chevron.left" size={19} weight="semibold" tintColor={C.t1} fallback={<ChevronLeft size={22} color={C.t1} />} />
        </GlassCircle>
        <View pointerEvents="none" className="absolute bottom-2 left-0 right-0 h-sm items-center justify-center">
          <Txt className="font-m800 text-[26px]" style={{ letterSpacing: -0.5 }}>{t("faq")}</Txt>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}>
        <View className="overflow-hidden rounded-card bg-raised">
          {FAQ.map((f, i) => (
            <Item key={i} q={f.q[lang] || f.q.en} a={f.a[lang] || f.a.en} open={open === i} onToggle={() => toggle(i)} last={i === FAQ.length - 1} />
          ))}
        </View>
        <Txt className="mb-4 mt-8 text-center text-[14.5px] text-t2">{t("faqMore")}</Txt>
        <Pill full kind="ghost" onPress={() => writeSupport(t("supportCopied", { email: SUPPORT_EMAIL }))}>{t("support")}</Pill>
      </ScrollView>
    </View>
  );
}
