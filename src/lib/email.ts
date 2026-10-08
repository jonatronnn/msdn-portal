import "server-only";
import { env } from "@/lib/env";

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Sends an email through Resend. Returns false (and logs) when email isn't
// configured or sending fails, so callers can tell the user.
export async function sendEmail({ to, subject, html }: { to: string[]; subject: string; html: string }) {
  const apiKey = env.resendApiKey();
  if (!apiKey) {
    console.info(`Email not configured; would have sent "${subject}" to ${to.join(", ")}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.emailFrom(), to, subject, html }),
  });
  if (!res.ok) console.error(`Email "${subject}" failed: ${res.status} ${await res.text()}`);
  return res.ok;
}
