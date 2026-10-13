import fs from "node:fs";
import postgres from "postgres";

const envText = fs.readFileSync("C:\\Users\\HP\\Desktop\\Soli\\soli-web\\.env", "utf8");
const get = (k) => {
  const m = envText.match(new RegExp(`^${k}=(.+)$`, "m"));
  if (!m) return "";
  let v = m[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
};

const sql = postgres(get("DATABASE_URL"), { max: 1, connect_timeout: 10 });
try {
  const docs = await sql`SELECT status, count(*)::int AS n FROM documents GROUP BY status`;
  console.log("DOCS_BY_STATUS:", JSON.stringify(docs));
  const chunks = await sql`SELECT count(*)::int AS n FROM chunks`;
  console.log("CHUNKS:", chunks[0].n);
  const users = await sql`SELECT count(*)::int AS n FROM users`;
  console.log("USERS:", users[0].n);
  const chats = await sql`SELECT count(*)::int AS n FROM chats`;
  console.log("CHATS:", chats[0].n);
} catch (e) {
  console.log("DB_ERROR:", e.message);
} finally {
  await sql.end();
}

const qUrl = get("QDRANT_URL").replace(/\/$/, "");
const col = get("QDRANT_COLLECTION") || "soli_chunks";
try {
  const r = await fetch(`${qUrl}/collections/${col}`, {
    headers: { "api-key": get("QDRANT_API_KEY") },
  });
  if (!r.ok) {
    console.log("QDRANT_STATUS:", r.status);
  } else {
    const j = await r.json();
    console.log("QDRANT_POINTS:", j.result?.points_count ?? "unknown");
    console.log("QDRANT_STATUS:", j.result?.status ?? "unknown");
  }
} catch (e) {
  console.log("QDRANT_ERROR:", e.message);
}
