function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

// Read lazily so a missing variable fails the request that needs it, with a
// clear message, rather than the build.
export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: () =>
    required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  supabaseSecretKey: () => required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY),
  appUrl: () => required("APP_URL", process.env.APP_URL).replace(/\/$/, ""),
  cronSecret: () => required("CRON_SECRET", process.env.CRON_SECRET),
  resendApiKey: () => process.env.RESEND_API_KEY,
  emailFrom: () => process.env.EMAIL_FROM ?? "Montagu Square Day Nursery <portal@example.com>",
};
