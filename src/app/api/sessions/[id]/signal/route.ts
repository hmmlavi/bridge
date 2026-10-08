import { getStore } from "@/lib/session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let raw = "";
  try {
    raw = await req.text();
  } catch {
    /* noop */
  }
  if (!raw || raw.length > 65_536) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  let body: { token?: unknown; role?: unknown; message?: unknown };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : null;
  const role = body.role === "phone" ? "phone" : body.role === "pc" ? "pc" : null;
  if (!role || body.message == null) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const result = await getStore().signal(id, token, role, body.message);
  switch (result) {
    case "ok":
      return Response.json({ ok: true });
    case "expired":
      return Response.json({ error: "expired" }, { status: 410 });
    case "forbidden":
      return Response.json({ error: "forbidden" }, { status: 403 });
    default:
      return Response.json({ error: "missing" }, { status: 404 });
  }
}
