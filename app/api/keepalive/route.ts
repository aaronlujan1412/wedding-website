import { supabase } from "@/lib/supabase";

/**
 * Keeps the Supabase project awake.
 *
 * Supabase pauses Free-plan projects after a 7-day stretch of low activity.
 * A wedding site goes quiet for weeks at a time, so a daily cron (see
 * `vercel.json`) hits this route to put one real query on the record.
 *
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` on cron invocations when
 * that variable is set on the project. Without the check this would be a free
 * public DB-poke for anyone who found the URL; without the variable itself the
 * cron just collects 401s and the project gets paused anyway, so the failure
 * is loud in the logs rather than silent.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // `head: true` returns the count with no rows attached — still a full round
  // trip to Postgres, which is the part that counts as activity.
  const { count, error } = await supabase
    .from("guest_groups")
    .select("id", { head: true, count: "exact" });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, count });
}
