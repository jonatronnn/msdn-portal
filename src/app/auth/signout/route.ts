import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(request.nextUrl.searchParams.get("reason") === "inactive" ? "/login?error=inactive" : "/login");
}
