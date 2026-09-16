import { supabase } from "@/lib/supabase";

/**
 * Where HotelFinder publishes the routes it has worked out.
 *
 * Same auth shape as `/api/backup`: a bearer token in the Authorization
 * header. The finder runs on the homelab box, and this exists so that box
 * never has to hold the Supabase secret key — a token that can only replace
 * proposals is a much smaller thing to lose than one that can read the guest
 * list.
 *
 * A publish replaces everything from that source at once, inside
 * `replace_trip_route_proposals`, so the tab is never half-updated. Nothing
 * here touches the plan: proposals become real only when someone sends one to
 * a planner's lane.
 */
export const dynamic = "force-dynamic";

/** One publish, so a runaway finder can't fill the table. */
const MAX_ROUTES = 25;
const MAX_STAYS_PER_ROUTE = 30;

type Stay = {
  place_id: string;
  place_name: string;
  name: string;
  name_ja?: string | null;
  check_in_on: string;
  check_out_on: string;
  cost_yen?: number | null;
  per_night_yen?: number | null;
  breakfast?: boolean;
  dinner?: boolean;
  source_property_id?: string | null;
  url?: string | null;
};

const isDay = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * Checked here rather than trusted, because this endpoint is reachable by
 * anything holding the token and the error a bad row causes otherwise is a
 * Postgres cast failure with no clue which stay caused it.
 */
function problemWith(routes: unknown): string | null {
  if (!Array.isArray(routes)) return "routes must be an array";
  if (routes.length > MAX_ROUTES) return `too many routes (max ${MAX_ROUTES})`;

  for (const [i, route] of routes.entries()) {
    if (typeof route !== "object" || route === null) return `route ${i} is not an object`;
    const r = route as Record<string, unknown>;
    if (typeof r.nights !== "number" || r.nights <= 0) return `route ${i} needs a positive nights`;
    if (typeof r.lodging_yen !== "number" || r.lodging_yen < 0) return `route ${i} needs lodging_yen`;

    const stays = r.stays;
    if (!Array.isArray(stays) || stays.length === 0) return `route ${i} has no stays`;
    if (stays.length > MAX_STAYS_PER_ROUTE) return `route ${i} has too many stays`;

    for (const [j, stay] of stays.entries()) {
      if (typeof stay !== "object" || stay === null) return `route ${i} stay ${j} is not an object`;
      const s = stay as Record<string, unknown>;
      const where = `route ${i} stay ${j}`;
      if (typeof s.name !== "string" || s.name.trim() === "") return `${where} needs a name`;
      if (typeof s.place_name !== "string" || s.place_name.trim() === "") return `${where} needs a place_name`;
      if (!isDay(s.check_in_on) || !isDay(s.check_out_on)) return `${where} needs YYYY-MM-DD dates`;
      if ((s.check_out_on as string) <= (s.check_in_on as string)) return `${where} checks out before it checks in`;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const secret = process.env.LODGING_FINDER_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "body is not JSON" }, { status: 400 });
  }

  const payload = (body ?? {}) as { source?: unknown; routes?: unknown };
  const source = typeof payload.source === "string" && payload.source.trim() ? payload.source.trim() : "hotelfinder";
  const problem = problemWith(payload.routes);
  if (problem) return Response.json({ ok: false, error: problem }, { status: 400 });

  const { data, error } = await supabase.rpc("replace_trip_route_proposals", {
    p_source: source,
    p_routes: payload.routes as unknown as Stay[],
  });
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, source, routes: data });
}
