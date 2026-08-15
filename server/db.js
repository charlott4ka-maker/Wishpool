// Tiny JSON-file datastore. Zero native deps — deploys anywhere.
// For higher scale, swap this module for Postgres; the API in index.js stays the same.
import fs from "fs";
import path from "path";

const FILE = process.env.DB_FILE || path.join(process.cwd(), "data.json");
const empty = { users: {}, rooms: {}, members: [], wishes: {}, wishRooms: [], reservations: {}, draws: {} };

let data;
try { data = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { data = structuredClone(empty); }

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(FILE, JSON.stringify(data)); } catch (e) { console.error("DB write failed", e); }
  }, 50);
}

export const db = {
  raw: () => data,
  save: persist,
};
