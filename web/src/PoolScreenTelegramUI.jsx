// Experimental reskin of the "My wishes" screen using @telegram-apps/telegram-ui
// instead of the app's hand-rolled components. Isolated in its own file on purpose:
// swapping the design system back out is just switching the render back to
// <PoolScreen/> in App.jsx (see the `designSystem` toggle there) — nothing here
// touches the classic components or their styles.
import "@telegram-apps/telegram-ui/dist/styles.css";
import { AppRoot, List, Section, Cell, Placeholder, Button, Chip as TguiChip } from "@telegram-apps/telegram-ui";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

// Self-contained duplicate of App.jsx's tiny tgConfirm/tgWebApp helpers, so this
// file has zero imports from App.jsx and stays a clean, independently deletable unit.
function tgWebApp() { try { return window.Telegram && window.Telegram.WebApp; } catch (e) { return null; } }
function tgConfirm(message, onYes) {
  const w = tgWebApp();
  if (w && w.showConfirm) w.showConfirm(message, (ok) => { if (ok) onYes(); });
  else if (typeof window !== "undefined" && window.confirm) { if (window.confirm(message)) onYes(); }
  else onYes();
}

// Reused as-is from App.jsx's own atoms: photo/emoji tile with the tap-to-enlarge
// lightbox already built for the classic screens. Passed in as a prop so this file
// doesn't need to import from App.jsx (avoids a circular import).
export default function PoolScreenTelegramUI({ wishes, rooms, onAdd, onToggleRoom, onDelete, GlossTile, t }) {
  const [openId, setOpenId] = useState(null);

  return (
    <AppRoot appearance="dark" platform="ios" style={{ background: "transparent" }}>
      <div style={{ padding: "10px 8px 4px" }}>
        <div style={{ color: "#fff", fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{t("poolTitle")}</div>
        <div style={{ color: "var(--tgui--hint_color)", fontSize: 14, marginTop: 2 }}>{t("poolSub")}</div>
      </div>

      {wishes.length === 0 ? (
        <Placeholder header={t("poolEmptyTitle")} description={t("poolEmptySub")}>
          <div style={{ fontSize: 56 }}>🎁</div>
        </Placeholder>
      ) : (
        <List>
          <Section header={t("poolTitle")}>
            {wishes.map((w) => (
              <div key={w.id}>
                <Cell
                  before={<GlossTile emoji={w.emoji} image={w.image} size={44} />}
                  subtitle={w.price || (w.rooms.length === 0 ? t("privateNote") : undefined)}
                  onClick={() => setOpenId(openId === w.id ? null : w.id)}
                  multiline
                >
                  {w.title}
                </Cell>
                {openId === w.id && (
                  <div style={{ padding: "0 24px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {rooms.length === 0 ? (
                        <span style={{ color: "var(--tgui--hint_color)", fontSize: 12.5 }}>{t("noRoomsHint")}</span>
                      ) : (
                        rooms.map((r) => (
                          <TguiChip
                            key={r.id}
                            mode={w.rooms.includes(r.id) ? "elevated" : "outline"}
                            onClick={() => onToggleRoom(w.id, r.id)}
                          >
                            {r.emoji} {r.name}
                          </TguiChip>
                        ))
                      )}
                    </div>
                    <Button size="s" mode="plain" before={<Trash2 size={14} />}
                      onClick={() => tgConfirm(t("confirmDeleteWish"), () => onDelete(w.id))}
                      style={{ alignSelf: "flex-start", color: "#FF5A5A" }}>
                      {t("deleteWish")}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </Section>
        </List>
      )}

      <div style={{ padding: "18px 16px" }}>
        <Button size="l" stretched before={<Plus size={18} />} onClick={onAdd}>{t("addWish")}</Button>
      </div>
    </AppRoot>
  );
}
