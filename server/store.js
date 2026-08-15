// Selects the storage backend:
//   DATABASE_URL set  -> Postgres (Neon / Supabase free tier) — no disk needed, data persists
//   PGLITE_TEST set   -> in-process WASM Postgres (tests only)
//   otherwise         -> in-memory (local dev; ephemeral)
import { createPgStore } from "./store-pg.js";
import { createMemStore } from "./store-mem.js";

export async function getStore() {
  if (process.env.PGLITE_TEST) {
    const { PGlite } = await import("@electric-sql/pglite");
    const db = await PGlite.create();
    const s = createPgStore((sql, params) => db.query(sql, params));
    await s.init();
    console.log("Store: PGlite (test)");
    return s;
  }
  if (process.env.DATABASE_URL) {
    const pg = (await import("pg")).default;
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const s = createPgStore((sql, params) => pool.query(sql, params));
    await s.init();
    console.log("Store: Postgres");
    return s;
  }
  const s = createMemStore();
  await s.init();
  console.log("Store: in-memory (dev — data is ephemeral, set DATABASE_URL for persistence)");
  return s;
}
