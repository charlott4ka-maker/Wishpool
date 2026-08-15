import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createApp } from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = await createApp();

const webDist = path.join(__dirname, "..", "web", "dist");
app.use(express.static(webDist));
app.get("*", (_req, res) => res.sendFile(path.join(webDist, "index.html")));

app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: "server_error" }); });

app.listen(PORT, () => console.log(`Wishpool server on :${PORT} (auth: ${process.env.BOT_TOKEN ? "telegram" : "DEV MODE"})`));
