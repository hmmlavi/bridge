import { getDb, hasDatabase } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!hasDatabase()) {
    return Response.json({ ok: true, driver: "memory" });
  }
  try {
    const db = getDb();
    if (!db) return Response.json({ ok: true, driver: "memory" });
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, driver: "postgres" });
  } catch {
    return Response.json({ ok: false, driver: "postgres" }, { status: 503 });
  }
}
