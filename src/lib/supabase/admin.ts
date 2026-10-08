import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

// Service-role client: bypasses row level security. Only use it after the
// caller's permissions have been checked, for things signed-in users can't do
// directly (inviting users, file storage, the daily notification job).
export function createAdminClient() {
  return createClient<Database>(env.supabaseUrl(), env.supabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
