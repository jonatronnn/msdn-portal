import { NextResponse, type NextRequest } from "next/server";
import { signedUrl, type Bucket } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

const buckets: Bucket[] = ["contracts", "policies", "payslips", "p45s"];

// Opens a stored PDF. The record is looked up as the signed-in user, so the
// database's access rules decide whether they may see it; only then is a
// one-minute link to the file created.
export async function GET(request: NextRequest, ctx: RouteContext<"/files/[bucket]/[id]">) {
  const { bucket, id } = await ctx.params;
  if (!buckets.includes(bucket as Bucket)) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase.from(bucket as Bucket).select("storage_path").eq("id", id).maybeSingle();
  if (!data) return new NextResponse("Not found", { status: 404 });

  const download = request.nextUrl.searchParams.get("download") ?? undefined;
  const url = await signedUrl(bucket as Bucket, data.storage_path, download);
  if (!url) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(url);
}
