import "server-only";
import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

/**
 * Server-only Supabase client.
 *
 * Uses the secret key, which bypasses row-level security. `guests`,
 * `guest_groups` and `seating_tables` have RLS enabled with no policies at
 * all, so this is the only key that can reach guest data — the publishable
 * key gets an empty result set.
 *
 * This must never reach the browser. The `server-only` import turns an
 * accidental client-component import into a build error instead of a leaked
 * key, which is the failure mode that matters: the publishable key was safe
 * here only because nothing happened to import it from the client.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
}
if (!supabaseKey) {
  throw new Error(
    "SUPABASE_SECRET_KEY is not set. Guest tables enforce RLS with no anon " +
      "policies, so without this key every query returns an empty result.",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});
