import { currentDriver, getStore, PAIRING_TTL } from "@/lib/session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const text = await req.text();
    if (!text || text.length > 16_384) return {};
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  const body = await readJson(req);
  try {
    const info = await getStore().create(body.name);
    return Response.json({ ...info, pairingTtl: PAIRING_TTL, driver: currentDriver() });
  } catch {
    return Response.json({ error: "session store unavailable" }, { status: 503 });
  }
}
