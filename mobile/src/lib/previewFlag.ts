// True when the web build runs inside the admin page's phone preview
// (wishpool.clickbrickk.com/admin, an iframe on the same site).
import { Platform } from "react-native";

export const ADMIN_PREVIEW = Platform.OS === "web" && typeof window !== "undefined" && window.parent !== window && /\/admin\/preview/.test(window.location.pathname);
