import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "manager" | "staff";

export type Session = {
  userId: string;
  email: string;
  role: Role;
  fullName: string;
  employeeId: string | null;
};

type SessionState =
  | { status: "signed-out" }
  | { status: "inactive" }
  | { status: "needs-mfa" }
  | { status: "ok"; session: Session };

const loadSession = cache(async (): Promise<SessionState> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return { status: "signed-out" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, active")
    .eq("id", claims.sub)
    .maybeSingle();
  if (!profile?.active) return { status: "inactive" };

  // Admins and managers must use two-step sign-in (the database also refuses
  // them elevated access without it).
  if (claims.aal !== "aal2" && (profile.role === "admin" || profile.role === "manager")) {
    return { status: "needs-mfa" };
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", claims.sub)
    .maybeSingle();

  return {
    status: "ok",
    session: {
      userId: claims.sub,
      email: (claims.email as string | undefined) ?? "",
      role: profile.role,
      fullName: profile.full_name,
      employeeId: employee?.id ?? null,
    },
  };
});

// For pages and server actions: returns the signed-in user or redirects.
export async function requireSession(...roles: Role[]): Promise<Session> {
  const state = await loadSession();
  if (state.status === "signed-out") redirect("/login");
  if (state.status === "inactive") redirect("/auth/signout?reason=inactive");
  if (state.status === "needs-mfa") redirect("/mfa");
  if (roles.length && !roles.includes(state.session.role)) redirect("/");
  return state.session;
}

export function isManager(session: Session) {
  return session.role === "admin" || session.role === "manager";
}
