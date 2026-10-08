"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { matchPayrollId } from "@/lib/payslips";
import { fullName } from "@/lib/staff";
import { removeFile, storePdf } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export type UploadResult = { ok: true; employee: string } | { ok: false; error: string };

// Stores one payslip PDF against the employee whose payroll ID is in its name.
// The upload screen calls this once per file so large batches don't hit the
// request size limit.
export async function uploadPayslip(formData: FormData): Promise<UploadResult> {
  const session = await requireSession("admin");
  const file = formData.get("file") as File | null;
  const payDate = formData.get("pay_date");
  if (typeof payDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(payDate)) return { ok: false, error: "Choose the pay date." };
  if (!file) return { ok: false, error: "No file." };

  const supabase = await createClient();
  const { data: employees } = await supabase.from("employees").select("id, first_name, last_name, payroll_id");
  const employee = matchPayrollId(file.name, employees ?? []);
  if (!employee) return { ok: false, error: "No single employee's payroll ID is in the file name." };

  const stored = await storePdf("payslips", employee.id, file);
  if ("error" in stored) return { ok: false, error: stored.error };

  const { error } = await supabase.from("payslips").insert({
    employee_id: employee.id,
    pay_date: payDate,
    file_name: file.name,
    storage_path: stored.path,
    uploaded_by: session.userId,
  });
  if (error) {
    await removeFile("payslips", stored.path);
    console.error(error);
    return { ok: false, error: "Couldn't save the payslip." };
  }
  revalidatePath("/payslips");
  return { ok: true, employee: fullName(employee) };
}

export async function deletePayslip(id: string) {
  await requireSession("admin");
  const supabase = await createClient();
  const { data } = await supabase.from("payslips").delete().eq("id", id).select("storage_path").maybeSingle();
  if (data) await removeFile("payslips", data.storage_path);
  revalidatePath("/payslips");
}
