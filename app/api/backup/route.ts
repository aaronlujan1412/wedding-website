import { runBackup } from "@/lib/backup";

/**
 * Nightly backup, triggered by the cron in `vercel.json`.
 *
 * Same auth shape as `/api/keepalive`: Vercel sends
 * `Authorization: Bearer <CRON_SECRET>` on cron invocations. Without the check
 * this would let anyone who found the URL make the project dump its whole
 * database on demand.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await runBackup();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    // Loud rather than silent: a backup that has been quietly failing for a
    // month is worse than no backup, because you think you have one.
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
