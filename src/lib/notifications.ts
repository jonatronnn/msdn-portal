import "server-only";
import { addDays, formatDate, todayInLondon, upcomingEvents, type StaffEvent } from "@/lib/dates";
import { escapeHtml, sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

const icons: Record<StaffEvent["type"], string> = { birthday: "🎂", anniversary: "🎉", start: "👋", leave: "🚪" };

function eventList(events: StaffEvent[], withDate: boolean) {
  const items = events
    .map((e) => `<li>${icons[e.type]} ${withDate ? `<strong>${formatDate(e.date)}</strong> – ` : ""}${escapeHtml(e.name)}: ${escapeHtml(e.label)}</li>`)
    .join("");
  return `<ul>${items}</ul><p><a href="${env.appUrl()}/staff">Open the staff directory</a></p>`;
}

// Runs once a day. Each email is logged by key first so a repeated run can't
// send it twice.
export async function sendDailyNotifications(today = todayInLondon()) {
  const db = createAdminClient();
  const [{ data: settings }, { data: employees }] = await Promise.all([
    db.from("notification_settings").select("*").eq("id", 1).single(),
    db.from("employees").select("id, first_name, last_name, date_of_birth, start_date, leave_date"),
  ]);
  if (!settings || !settings.recipients.length || !employees) return [];

  const emails: { key: string; subject: string; html: string }[] = [];
  const todays = upcomingEvents(employees, today, 1);

  const birthdays = todays.filter((e) => e.type === "birthday");
  if (settings.birthdays_enabled && birthdays.length) {
    emails.push({ key: `birthday:${today}`, subject: "Staff birthday today", html: eventList(birthdays, false) });
  }
  const anniversaries = todays.filter((e) => e.type === "anniversary");
  if (settings.anniversaries_enabled && anniversaries.length) {
    emails.push({ key: `anniversary:${today}`, subject: "Work anniversary today", html: eventList(anniversaries, false) });
  }

  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  if (settings.weekly_digest_enabled && weekday === settings.weekly_digest_day) {
    const week = upcomingEvents(employees, today, 7);
    emails.push({
      key: `weekly:${today}`,
      subject: `This week at the nursery: ${formatDate(today)} – ${formatDate(addDays(today, 6))}`,
      html: week.length ? eventList(week, true) : "<p>No staff birthdays, anniversaries, starters or leavers this week.</p>",
    });
  }

  const sent: string[] = [];
  for (const email of emails) {
    const { error } = await db.from("notification_log").insert({ key: email.key });
    if (error) continue; // already sent
    if (await sendEmail({ to: settings.recipients, subject: email.subject, html: email.html })) {
      sent.push(email.key);
    } else {
      await db.from("notification_log").delete().eq("key", email.key);
    }
  }
  return sent;
}
