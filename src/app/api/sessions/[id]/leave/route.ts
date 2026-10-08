import { getStore } from "@/lib/session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let body: Record<string, unknown> = {};
  try {
    // sendBeacon may send as text/plain — parse leniently
    const text = await req.text();
    if (text && text.length < 16_384) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* invalid body */
  }

  const token = typeof body.token === "string" ? body.token : null;
  const role = body.role === "phone" ? "phone" : "pc";
  const result = await getStore().leave(id, token, role);
  if (result === "forbidden") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  return Response.json({ ok: true });
}
