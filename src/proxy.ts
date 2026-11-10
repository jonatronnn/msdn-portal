import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Static files (logos, the tab icon) load without signing in.
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|ico)$).*)"],
};
