import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type Bucket = "contracts" | "policies" | "payslips" | "p45s";

// Keep in step with serverActions.bodySizeLimit in next.config.ts.
export const MAX_FILE_MB = 4;

// Checks an uploaded file is a PDF and stores it. Callers must have checked
// the user's permissions first: storage is written with the service role.
export async function storePdf(
  bucket: Bucket,
  folder: string,
  file: File | null,
): Promise<{ error: string } | { path: string; sha256: string }> {
  if (!file || file.size === 0) return { error: "Choose a PDF file." }
  if (file.size > MAX_FILE_MB * 1024 * 1024) return { error: `Files must be under ${MAX_FILE_MB}MB.` }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString() !== "%PDF-") return { error: `${file.name} is not a PDF.` }

  const path = `${folder}/${randomUUID()}.pdf`;
  const { error } = await createAdminClient()
    .storage.from(bucket)
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (error) {
    console.error(error);
    return { error: "Couldn't store the file. Please try again." }
  }
  return { path, sha256: createHash("sha256").update(bytes).digest("hex") }
}

export async function removeFile(bucket: Bucket, path: string) {
  await createAdminClient().storage.from(bucket).remove([path]);
}

export async function signedUrl(bucket: Bucket, path: string, download?: string) {
  const { data } = await createAdminClient()
    .storage.from(bucket)
    .createSignedUrl(path, 60, download ? { download } : undefined);
  return data?.signedUrl ?? null;
}
