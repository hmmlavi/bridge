import { getStore } from "@/lib/session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text && text.length < 16_384) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* invalid body */
  }

  const token = typeof body.token === "string" ? body.token : null;
  const result = await getStore().join(id, token, body.name);

  switch (result.status) {
    case "ok":
      return Response.json({ ok: true, pcName: result.pcName, phoneName: result.phoneName });
    case "busy":
      return Response.json({ error: "busy" }, { status: 409 });
    case "expired":
      return Response.json({ error: "expired" }, { status: 410 });
    case "forbidden":
      return Response.json({ error: "forbidden" }, { status: 403 });
    default:
      return Response.json({ error: "missing" }, { status: 404 });
  }
}
