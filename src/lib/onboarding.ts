import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { escapeHtml, sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { missingEmploymentDetails } from "@/lib/staff";

type Client = SupabaseClient<Database>;
export type Automation = "form_sent" | "form_returned" | "employment_details" | "contract_uploaded" | "payroll_ref" | "famly";

export const STARTER_LINK_DAYS = 14;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Ticks the onboarding step with this automation, if the employee has one
// still open, recording who or what did it.
export async function completeAutomation(db: Client, employeeId: string, automation: Automation, byName: string) {
  const { error } = await db
    .from("onboarding_tasks")
    .update({ completed_at: new Date().toISOString(), completed_by_name: byName })
    .eq("employee_id", employeeId)
    .eq("automation", automation)
    .is("completed_at", null);
  if (error) console.error(error);
}

// Runs the automations that depend on what's in the employee record.
export async function checkRecordAutomations(db: Client, employeeId: string, byName: string) {
  const { data: e } = await db.from("employees").select("*").eq("id", employeeId).single();
  if (!e) return;
  if (missingEmploymentDetails(e).length === 0) await completeAutomation(db, employeeId, "employment_details", byName);
  if (e.payroll_id) await completeAutomation(db, employeeId, "payroll_ref", byName);
}

// Emails the employee a one-off link to the Important information form. Any
// earlier unused link stops working. If the email can't be sent, the link is
// returned so the manager can pass it on another way.
export async function sendStarterForm(
  db: Client,
  employee: { id: string; first_name: string; email: string },
  byName: string,
): Promise<{ error: string } | { message: string; link?: string }> {
  const now = new Date();
  await db
    .from("starter_form_links")
    .update({ revoked_at: now.toISOString() })
    .eq("employee_id", employee.id)
    .is("used_at", null)
    .is("revoked_at", null);

  const token = randomBytes(32).toString("base64url");
  const { error } = await db.from("starter_form_links").insert({
    employee_id: employee.id,
    token_hash: hashToken(token),
    sent_to: employee.email,
    sent_by_name: byName,
    expires_at: new Date(now.getTime() + STARTER_LINK_DAYS * 86_400_000).toISOString(),
  });
  if (error) {
    console.error(error);
    return { error: "Couldn't create the form link. Please try again." };
  }

  const link = `${env.appUrl()}/starter/${token}`;
  const emailed = await sendEmail({
    to: [employee.email],
    subject: "Montagu Square Day Nursery: your important information form",
    html: `<p>Hi ${escapeHtml(employee.first_name)},</p>
<p>Welcome to Montagu Square Day Nursery! Please fill in your important information form, which asks for your contact details, emergency contact, National Insurance number and bank details for payroll.</p>
<p><a href="${link}">Open your form</a></p>
<p>The link works once and expires in ${STARTER_LINK_DAYS} days. Please don't forward this email.</p>`,
  });
  await completeAutomation(db, employee.id, "form_sent", byName);

  if (!emailed) {
    return { message: "The email couldn't be sent. Send this link to them yourself (it works once):", link };
  }
  return { message: `Form sent to ${employee.email}.` };
}
