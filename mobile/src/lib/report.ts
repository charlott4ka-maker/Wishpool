// Reporting a friend's wish or the friend (App Review 1.2): pick a reason in an
// action sheet; the report goes to support and the admin page's Жалобы tab.
import { toast } from "../components/Toast";
import { api } from "../services/api";
import { actionSheet } from "./actionSheet";
import { haptic } from "./haptics";

type T = (id: string, p?: Record<string, string | number>) => string;
const REASONS = ["spam", "offensive", "inappropriate", "other"] as const;

export function askReport(t: T, target: { wishId?: string; userId?: string; roomId: string }, opts: { root?: boolean } = {}) {
  actionSheet(
    t("reportWhy"),
    t("setCancel"),
    REASONS.map((reason) => [
      t("reason" + reason[0].toUpperCase() + reason.slice(1)),
      () =>
        api
          .report({ ...target, reason })
          .then(() => {
            haptic("success");
            toast.success(t("toastReported"), opts);
          })
          .catch(() => toast.error(t("toastError"), opts)),
    ]),
  );
}
