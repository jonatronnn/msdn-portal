import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { sendDailyNotifications } from "@/lib/notifications";

// Called once a day by Vercel Cron (see vercel.json), which sends
// "Authorization: Bearer $CRON_SECRET".
export async function GET(request: NextRequest) {
  const expected = Buffer.from(`Bearer ${env.cronSecret()}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const sent = await sendDailyNotifications();
  return NextResponse.json({ sent });
}
