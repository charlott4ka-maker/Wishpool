import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" makes the build work on any host path (Vercel, Netlify, GH Pages)
export default defineConfig({ plugins: [react()], base: "./" });
