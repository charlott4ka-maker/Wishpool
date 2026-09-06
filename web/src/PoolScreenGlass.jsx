// Experimental "glass" reskin of the "My wishes" screen — dark background,
// frosted-glass (backdrop-blur) cards, pill shapes, solid white CTA button.
// Colors are eyeballed from a reference screenshot; swap the GLASS_COLORS
// values below for exact hex codes once you have them, nothing else needs
// to change.
//
// Isolated in its own file on purpose: this has zero imports from App.jsx
// (own tgConfirm/tgWebApp copies), so reverting is either flipping the
// `designSystem` toggle back in Profile, or deleting this file and its two
// call sites in App.jsx.
import { useState } from "react";
import { Plus, Trash2, ChevronRight } from "lucide-react";

const GLASS_COLORS = {
  bg: "#0B0D14",
  bgGradTop: "#11141F",
  blobBlue: "rgba(61,90,255,0.35)",
  blobPurple: "rgba(140,60,255,0.22)",
  card: "rgba(255,255,255,0.06)",
  cardBorder: "rgba(255,255,255,0.10)",
  text1: "#FFFFFF",
  text2: "rgba(255,255,255,0.55)",
  text3: "rgba(255,255,255,0.35)",
  green: "#2FCB6C",
  greenBg: "rgba(47,203,108,0.16)",
  amber: "#F5A623",
  amberBg: "rgba(245,166,35,0.16)",
};

function tgWebApp() { try { return window.Telegram && window.Telegram.WebApp; } catch (e) { return null; } }
function tgConfirm(message, onYes) {
  const w = tgWebApp();
  if (w && w.showConfirm) w.showConfirm(message, (ok) => { if (ok) onYes(); });
  else if (typeof window !== "undefined" && window.confirm) { if (window.confirm(message)) onYes(); }
  else onYes();
}

function GlassCard({ children, onClick, style }) {
  return (
    <div onClick={onClick} style={{
      background: GLASS_COLORS.card, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      border: `1px solid ${GLASS_COLORS.cardBorder}`, borderRadius: 24,
      boxShadow: "0 8px 30px rgba(0,0,0,0.35)", cursor: onClick ? "pointer" : "default", ...style,
    }}>
      {children}
    </div>
  );
}
function Pill({ children, tone = "default", style, onClick }) {
  const tones = {
    default: { background: "rgba(255,255,255,0.08)", color: GLASS_COLORS.text2, border: `1px solid ${GLASS_COLORS.cardBorder}` },
    green: { background: GLASS_COLORS.greenBg, color: GLASS_COLORS.green, border: "1px solid rgba(47,203,108,0.3)" },
    amber: { background: GLASS_COLORS.amberBg, color: GLASS_COLORS.amber, border: "1px solid rgba(245,166,35,0.3)" },
  };
  return (
    <span onClick={onClick} style={{ ...tones[tone], padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5, ...style }}>
      {children}
    </span>
  );
}

export default function PoolScreenGlass({ wishes, rooms, onAdd, onToggleRoom, onDelete, GlossTile, t }) {
  const [openId, setOpenId] = useState(null);

  return (
    <div style={{ position: "relative", margin: "-16px", padding: 16, minHeight: "100vh", overflow: "hidden", background: `linear-gradient(180deg, ${GLASS_COLORS.bgGradTop} 0%, ${GLASS_COLORS.bg} 40%)` }}>
      {/* soft color blobs so the frosted glass has something to refract */}
      <div style={{ position: "absolute", top: -80, right: -60, width: 280, height: 280, borderRadius: "50%", background: GLASS_COLORS.blobBlue, filter: "blur(70px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 220, left: -100, width: 260, height: 260, borderRadius: "50%", background: GLASS_COLORS.blobPurple, filter: "blur(80px)", pointerEvents: "none" }} />

      <div style={{ position: "relative" }}>
        <div style={{ padding: "6px 4px 16px" }}>
          <div style={{ color: GLASS_COLORS.text1, fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>{t("poolTitle")}</div>
          <div style={{ color: GLASS_COLORS.text2, fontSize: 14, marginTop: 4 }}>{t("poolSub")}</div>
        </div>

        {wishes.length === 0 ? (
          <GlassCard style={{ padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48 }}>🎁</div>
            <div style={{ color: GLASS_COLORS.text1, fontSize: 17, fontWeight: 700, marginTop: 14 }}>{t("poolEmptyTitle")}</div>
            <div style={{ color: GLASS_COLORS.text2, fontSize: 14, marginTop: 6, lineHeight: 1.4 }}>{t("poolEmptySub")}</div>
          </GlassCard>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {wishes.map((w) => {
              const shared = w.rooms.length > 0;
              return (
                <GlassCard key={w.id} onClick={() => setOpenId(openId === w.id ? null : w.id)} style={{ padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <GlossTile emoji={w.emoji} image={w.image} size={52} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: GLASS_COLORS.text1, fontSize: 16, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.title}</div>
                      {w.price && <div style={{ color: GLASS_COLORS.text2, fontSize: 13, marginTop: 2 }}>{w.price}</div>}
                    </div>
                    <Pill tone={shared ? "green" : "default"}>{shared ? "Shared" : "Private"}</Pill>
                    <ChevronRight size={18} color={GLASS_COLORS.text3} style={{ transform: openId === w.id ? "rotate(90deg)" : "none", transition: ".2s", flexShrink: 0 }} />
                  </div>
                  {openId === w.id && (
                    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${GLASS_COLORS.cardBorder}` }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                        {rooms.length === 0 ? (
                          <span style={{ color: GLASS_COLORS.text3, fontSize: 12.5 }}>{t("noRoomsHint")}</span>
                        ) : (
                          rooms.map((r) => (
                            <Pill key={r.id} tone={w.rooms.includes(r.id) ? "amber" : "default"}
                              style={{ cursor: "pointer" }}
                              onClick={(e) => { e.stopPropagation(); onToggleRoom(w.id, r.id); }}>
                              {r.emoji} {r.name}
                            </Pill>
                          ))
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); tgConfirm(t("confirmDeleteWish"), () => onDelete(w.id)); }}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#FF6B4A", fontSize: 13.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Trash2 size={14} /> {t("deleteWish")}
                      </button>
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )}

        <button onClick={onAdd} style={{
          width: "100%", marginTop: 18, padding: "16px", borderRadius: 999, border: "none", cursor: "pointer",
          background: "#FFFFFF", color: GLASS_COLORS.bg, fontSize: 16, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <Plus size={18} /> {t("addWish")}
        </button>
      </div>
    </div>
  );
}
