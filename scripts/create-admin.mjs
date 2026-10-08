// Invites the first owner/admin. After that, admins invite everyone else from
// the Users page.
//
//   node --env-file=.env.local scripts/create-admin.mjs you@example.com "Your Name"
import { createClient } from "@supabase/supabase-js";

const [email, fullName] = process.argv.slice(2);
if (!email || !fullName) {
  console.error('Usage: node --env-file=.env.local scripts/create-admin.mjs <email> "<full name>"');
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);
if (error) {
  console.error(`Couldn't invite ${email}: ${error.message}`);
  process.exit(1);
}

const { error: profileError } = await supabase
  .from("profiles")
  .update({ role: "admin", full_name: fullName, active: true })
  .eq("id", data.user.id);
if (profileError) {
  console.error(`Invited, but couldn't make them an admin: ${profileError.message}`);
  process.exit(1);
}

console.log(`Invitation sent to ${email}. They'll set a password and then set up two-step sign-in.`);
