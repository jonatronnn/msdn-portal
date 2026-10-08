"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { failed, text, type ActionState } from "@/lib/action-state";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function signContract(contractId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  if (formData.get("agree") !== "on") return { error: "Tick the box to confirm you agree." };
  const name = text(formData, "signed_name");
  if (!name) return { error: "Type your full name to sign." };

  const h = await headers();
  const supabase = await createClient();
  const { error } = await supabase.rpc("sign_contract", {
    p_contract_id: contractId,
    p_signed_name: name,
    p_ip: h.get("x-forwarded-for")?.split(",")[0].trim() ?? "",
    p_user_agent: h.get("user-agent") ?? "",
  });
  if (error) return failed(error);
  revalidatePath(`/contracts/${contractId}`);
  return { message: "Signed. Thank you!" };
}
