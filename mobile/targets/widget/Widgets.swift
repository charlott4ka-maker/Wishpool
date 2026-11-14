// Wishpool home-screen widgets (Premium): the nearest birthday and Secret Santa.
// The app writes one JSON string under "wp_widget" into the App Group
// (src/settings/WidgetSync.tsx); days are counted here, so the countdown moves
// at midnight without the app being opened.
import SwiftUI
import WidgetKit

let appGroup = "group.app.wishpool.ios"
let bg = Color(red: 0x15 / 255, green: 0x18 / 255, blue: 0x1D / 255)
let raised = Color(red: 0x1E / 255, green: 0x22 / 255, blue: 0x28 / 255)
let t2 = Color(red: 0x8B / 255, green: 0x93 / 255, blue: 0xA3 / 255)
let blue = Color(red: 0x0A / 255, green: 0x82 / 255, blue: 0xF9 / 255)
let santaRed = Color(red: 0x8F / 255, green: 0x2F / 255, blue: 0x3F / 255)

struct Person: Codable { let name: String; let color: String; let initial: String }
struct Bday: Codable { let roomId: String; let name: String; let md: String; let color: String; let initial: String }
struct Santa: Codable { let roomId: String; let room: String; let date: String; let drawn: Int; let target: Person? }
struct Payload: Codable {
  let premium: Int
  let lang: String
  let bday: Bday?
  let santa: Santa?
  let s: [String: String]
}

func load() -> Payload? {
  guard let raw = UserDefaults(suiteName: appGroup)?.string(forKey: "wp_widget"), let data = raw.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(Payload.self, from: data)
}

func color(_ hex: String) -> Color {
  var v: UInt64 = 0
  Scanner(string: hex.replacingOccurrences(of: "#", with: "")).scanHexInt64(&v)
  return Color(red: Double((v >> 16) & 255) / 255, green: Double((v >> 8) & 255) / 255, blue: Double(v & 255) / 255)
}

func startOfToday() -> Date { Calendar.current.startOfDay(for: Date()) }

/// days from today to the next "MM-DD" (this year or next)
func daysToMonthDay(_ md: String, from today: Date) -> Int? {
  let p = md.split(separator: "-").compactMap { Int($0) }
  guard p.count == 2 else { return nil }
  let cal = Calendar.current
  var c = cal.dateComponents([.year], from: today); c.month = p[0]; c.day = p[1]
  guard var d = cal.date(from: c) else { return nil }
  if d < today { c.year = (c.year ?? 0) + 1; d = cal.date(from: c) ?? d }
  return cal.dateComponents([.day], from: today, to: d).day
}

func daysToDate(_ iso: String, from today: Date) -> Int? {
  let p = iso.split(separator: "-").compactMap { Int($0) }
  guard p.count == 3 else { return nil }
  var c = DateComponents(); c.year = p[0]; c.month = p[1]; c.day = p[2]
  guard let d = Calendar.current.date(from: c) else { return nil }
  return Calendar.current.dateComponents([.day], from: today, to: d).day
}

func dayWord(_ n: Int, _ lang: String) -> String {
  if lang == "en" { return n == 1 ? "day" : "days" }
  let f = lang == "uk" ? ["день", "дні", "днів"] : ["день", "дня", "дней"]
  let m10 = n % 10, m100 = n % 100
  if m10 == 1 && m100 != 11 { return f[0] }
  if m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) { return f[1] }
  return f[2]
}

/// the widget gallery's own words, in the phone's language
func loc(_ ru: String, _ uk: String, _ en: String) -> String {
  let l = Locale.preferredLanguages.first ?? "en"
  return l.hasPrefix("ru") ? ru : l.hasPrefix("uk") ? uk : en
}

struct Entry: TimelineEntry { let date: Date; let p: Payload? }

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> Entry { Entry(date: Date(), p: nil) }
  func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) { completion(Entry(date: Date(), p: load())) }
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    let p = load()
    let today = startOfToday()
    // one entry per midnight for a week, so the countdown moves on its own
    let entries = (0..<7).compactMap { i in Calendar.current.date(byAdding: .day, value: i, to: today) }.map { Entry(date: $0, p: p) }
    completion(Timeline(entries: [Entry(date: Date(), p: p)] + entries.dropFirst(), policy: .atEnd))
  }
}

struct Avatar: View {
  let initial: String; let tint: Color; let size: CGFloat
  var body: some View {
    Text(initial).font(.system(size: size * 0.42, weight: .bold)).foregroundColor(.white)
      .frame(width: size, height: size).background(Circle().fill(tint))
  }
}

/// Not Premium (or no data yet): a crown and one line, a tap opens the paywall
struct Locked: View {
  let text: String
  var body: some View {
    VStack(spacing: 8) {
      Image(systemName: "crown.fill").font(.system(size: 22, weight: .semibold)).foregroundColor(blue)
      Text(text).font(.system(size: 13, weight: .semibold)).foregroundColor(.white).multilineTextAlignment(.center)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

struct Empty: View {
  let symbol: String; let text: String
  var body: some View {
    VStack(spacing: 8) {
      Image(systemName: symbol).font(.system(size: 22, weight: .semibold)).foregroundColor(t2)
      Text(text).font(.system(size: 13, weight: .semibold)).foregroundColor(t2).multilineTextAlignment(.center)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

// MARK: - the nearest birthday

struct BirthdayView: View {
  @Environment(\.widgetFamily) var family
  let entry: Entry
  var body: some View {
    Group {
      if let p = entry.p, p.premium == 1 {
        if let b = p.bday, let n = daysToMonthDay(b.md, from: startOfToday()) {
          let when = n == 0 ? (p.s["today"] ?? "Today") : n == 1 ? (p.s["tomorrow"] ?? "Tomorrow") : "\(n) \(dayWord(n, p.lang))"
          if family == .systemMedium {
            HStack(spacing: 14) {
              Avatar(initial: b.initial, tint: color(b.color), size: 64)
              VStack(alignment: .leading, spacing: 4) {
                Text(p.s["bdayTitle"] ?? "Birthday").font(.system(size: 13, weight: .semibold)).foregroundColor(t2)
                Text(b.name).font(.system(size: 18, weight: .bold)).foregroundColor(.white).lineLimit(1)
                Text(when).font(.system(size: 26, weight: .heavy)).foregroundColor(blue)
              }
              Spacer(minLength: 0)
            }
          } else {
            VStack(alignment: .leading, spacing: 6) {
              Avatar(initial: b.initial, tint: color(b.color), size: 40)
              Spacer(minLength: 0)
              Text(when).font(.system(size: 24, weight: .heavy)).foregroundColor(blue).minimumScaleFactor(0.6).lineLimit(1)
              Text(b.name).font(.system(size: 14, weight: .semibold)).foregroundColor(.white).lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
          }
        } else {
          Empty(symbol: "gift", text: p.s["bdayEmpty"] ?? "No birthdays yet")
        }
      } else {
        Locked(text: entry.p?.s["locked"] ?? "Premium")
      }
    }
    .widgetURL(URL(string: entry.p?.premium != 1 ? "wishpool://paywall" : entry.p?.bday.map { "wishpool://room/\($0.roomId)" } ?? "wishpool://room/new"))
    .containerBackground(for: .widget) { bg }
  }
}

struct BirthdayWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "birthday", provider: Provider()) { BirthdayView(entry: $0) }
      .configurationDisplayName(loc("День рождения", "День народження", "Birthday"))
      .description(loc("Ближайший день рождения в твоих комнатах.", "Найближчий день народження у твоїх кімнатах.", "The nearest birthday in your rooms."))
      .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Secret Santa

struct SantaView: View {
  @Environment(\.widgetFamily) var family
  let entry: Entry
  var body: some View {
    Group {
      if let p = entry.p, p.premium == 1 {
        if let s = p.santa {
          let n = daysToDate(s.date, from: startOfToday())
          let swap: String? = n.flatMap { $0 < 0 ? nil : $0 == 0 ? (p.s["swapToday"] ?? "Gift swap today") : "\(p.s["swapIn"] ?? "Gift swap in") \($0) \(dayWord($0, p.lang))" }
          VStack(alignment: .leading, spacing: 6) {
            Text(p.s["santaTitle"] ?? "Secret Santa").font(.system(size: 13, weight: .semibold)).foregroundColor(.white.opacity(0.75))
            Spacer(minLength: 0)
            if s.drawn == 1, let t = s.target {
              HStack(spacing: 10) {
                Avatar(initial: t.initial, tint: color(t.color), size: family == .systemMedium ? 48 : 34)
                VStack(alignment: .leading, spacing: 2) {
                  Text(p.s["youGive"] ?? "You're giving").font(.system(size: 12, weight: .semibold)).foregroundColor(.white.opacity(0.75))
                  Text(t.name).font(.system(size: family == .systemMedium ? 22 : 17, weight: .heavy)).foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.7)
                }
              }
            } else {
              Text(p.s["notDrawn"] ?? "No draw yet").font(.system(size: 15, weight: .bold)).foregroundColor(.white).lineLimit(2)
            }
            if let swap { Text(swap).font(.system(size: 12, weight: .semibold)).foregroundColor(.white.opacity(0.85)).lineLimit(1).minimumScaleFactor(0.7) }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        } else {
          Empty(symbol: "gift.fill", text: p.s["santaEmpty"] ?? "Make a Secret Santa room")
        }
      } else {
        Locked(text: entry.p?.s["locked"] ?? "Premium")
      }
    }
    .widgetURL(URL(string: entry.p?.premium != 1 ? "wishpool://paywall" : entry.p?.santa.map { "wishpool://room/\($0.roomId)" } ?? "wishpool://room/new?preset=santa"))
    .containerBackground(for: .widget) {
      if entry.p?.premium == 1 && entry.p?.santa != nil {
        LinearGradient(colors: [Color(red: 0x5E / 255, green: 0x1B / 255, blue: 0x2A / 255), santaRed], startPoint: .topLeading, endPoint: .bottomTrailing)
      } else { bg }
    }
  }
}

struct SantaWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "santa", provider: Provider()) { SantaView(entry: $0) }
      .configurationDisplayName(loc("Тайный Санта", "Таємний Санта", "Secret Santa"))
      .description(loc("Кому ты даришь и сколько до обмена подарками.", "Кому ти даруєш і скільки до обміну подарунками.", "Who you're giving to and the gift swap countdown."))
      .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct WishpoolWidgets: WidgetBundle {
  var body: some Widget {
    BirthdayWidget()
    SantaWidget()
  }
}
