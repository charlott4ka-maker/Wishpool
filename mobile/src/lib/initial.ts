// The letter on an avatar. Names in "fancy fonts" (𝘖𝘴𝘪𝘵𝘬𝘰𝘷𝘴𝘬𝘢𝘺𝘢) are made of
// characters that take two halves of a JS string, and taking only the first
// half drew a "?" box. NFKC turns them into plain letters; the first real
// letter or digit wins, else the first whole character (an emoji), never half of one.
export function initial(name?: string | null): string {
  const s = (name || "").normalize("NFKC").trim();
  const chars = Array.from(s);
  const letter = chars.find((c) => c.toLowerCase() !== c.toUpperCase() || (c >= "0" && c <= "9"));
  return (letter || chars[0] || "•").toUpperCase();
}
