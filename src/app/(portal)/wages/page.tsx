import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { todayInLondon } from "@/lib/dates";

export default async function WagesPage() {
  await requireSession("admin", "manager");
  redirect(`/wages/${todayInLondon().slice(0, 7)}`);
}
