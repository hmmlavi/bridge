import { getStore } from "@/lib/session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Short-poll event channel. Returns all queued events for the role with
 * `id > after`, plus a session snapshot. Works through any serverless
 * proxy — no long-lived connections are held open.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const roleParam = url.searchParams.get("role");
  const token = url.searchParams.get("k");
  const after = Number(url.searchParams.get("after") ?? "0") || 0;

  if (roleParam !== "pc" && roleParam !== "phone") {
    return Response.json({ error: "bad role" }, { status: 400 });
  }

  let outcome;
  try {
    outcome = await getStore().poll(id, roleParam, token, after);
  } catch {
    return Response.json({ error: "session store unavailable" }, { status: 503 });
  }

  switch (outcome.status) {
    case "ok":
      return Response.json(
        { events: outcome.events, snapshot: outcome.snapshot, now: outcome.now },
        { headers: { "Cache-Control": "no-store" } }
      );
    case "expired":
      return Response.json({ error: "expired" }, { status: 410 });
    case "forbidden":
      return Response.json({ error: "forbidden" }, { status: 403 });
    default:
      return Response.json({ error: "missing" }, { status: 404 });
  }
}
