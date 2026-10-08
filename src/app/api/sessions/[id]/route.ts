import { getStore } from "@/lib/session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const text = await req.text();
    if (!text || text.length > 16_384) return {};
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const token = new URL(req.url).searchParams.get("k");
  const result = await getStore().getStatus(id, token);
  if (typeof result === "string") {
    return Response.json(
      { error: result },
      { status: result === "forbidden" ? 403 : result === "expired" ? 410 : 404 }
    );
  }
  return Response.json({ id, ...result });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await readJson(req);
  const token = typeof body.token === "string" ? body.token : null;
  const result = await getStore().destroy(id, token);
  if (result === "forbidden") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  return Response.json({ ok: true });
}
