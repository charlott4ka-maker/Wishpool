import crypto from "crypto";

// Wish photos in Cloudflare R2 (S3-compatible object storage, 10 GB free).
// When the R2_* variables are set, uploaded photos go to the bucket and the
// database keeps only their public URL. Without them nothing changes: photos
// stay inline in the database as before.
//
//   R2_ACCOUNT_ID         Cloudflare account id
//   R2_ACCESS_KEY_ID      R2 API token: access key id
//   R2_SECRET_ACCESS_KEY  R2 API token: secret access key
//   R2_BUCKET             bucket name, e.g. wishpool-photos
//   R2_PUBLIC_URL         public base URL of the bucket (https://pub-xxxx.r2.dev or a custom domain)
const env = () => ({
  account: process.env.R2_ACCOUNT_ID, key: process.env.R2_ACCESS_KEY_ID, secret: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET, pub: (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, ""),
});
export const storageOn = () => { const e = env(); return !!(e.account && e.key && e.secret && e.bucket && e.pub); };

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());

// AWS Signature V4 headers for one request (R2 uses region "auto", service "s3").
export function signV4({ method, host, path, body = "", accessKey, secretKey, region = "auto", service = "s3", date = new Date(), headers = {} }) {
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = amzDate.slice(0, 8);
  const payloadHash = sha256(body);
  const all = { ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()])), host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate };
  const names = Object.keys(all).sort();
  const canonical = [method, path.split("/").map(enc).join("/"), "", names.map(n => `${n}:${all[n]}`).join("\n") + "\n", names.join(";"), payloadHash].join("\n");
  const scope = `${day}/${region}/${service}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n");
  const kSign = hmac(hmac(hmac(hmac("AWS4" + secretKey, day), region), service), "aws4_request");
  const signature = crypto.createHmac("sha256", kSign).update(toSign).digest("hex");
  return { ...all, authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}` };
}

async function r2(method, objectKey, body, contentType) {
  const e = env();
  const host = `${e.account}.r2.cloudflarestorage.com`;
  const path = `/${e.bucket}/${objectKey}`;
  const headers = signV4({ method, host, path, body: body || "", accessKey: e.key, secretKey: e.secret, headers: contentType ? { "content-type": contentType, "cache-control": "public, max-age=31536000, immutable" } : {} });
  delete headers.host;
  const r = await fetch(`https://${host}${path.split("/").map(enc).join("/")}`, { method, headers, body: body || undefined, signal: AbortSignal.timeout(15000) });
  if (!r.ok && !(method === "DELETE" && r.status === 404)) throw new Error(`r2_${method}_${r.status}`);
}

// data:image/...;base64 -> public URL in the bucket. Anything else (already a URL) is returned as is.
export async function storeImage(src, prefix) {
  const m = typeof src === "string" && src.match(/^data:(image\/(jpeg|png|webp|gif));base64,(.*)$/s);
  if (!m || !storageOn()) return src;
  const ext = m[2] === "jpeg" ? "jpg" : m[2];
  const objectKey = `${prefix}/${crypto.randomBytes(8).toString("hex")}.${ext}`;
  await r2("PUT", objectKey, Buffer.from(m[3], "base64"), m[1]);
  return `${env().pub}/${objectKey}`;
}
export async function storeImages(list, prefix) { return Promise.all((list || []).map(x => storeImage(x, prefix))); }

// Remove photos of a deleted wish (only ones that live in our bucket).
export async function dropImages(list) {
  if (!storageOn()) return;
  const base = env().pub + "/";
  await Promise.all((list || []).filter(u => typeof u === "string" && u.startsWith(base))
    .map(u => r2("DELETE", u.slice(base.length)).catch(e => console.error("r2 delete failed", e.message))));
}
