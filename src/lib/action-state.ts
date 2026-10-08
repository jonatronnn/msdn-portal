export type ActionState = { error?: string; message?: string } | null;

// Turns a Supabase error into a message suitable for the person using the app.
// Only our own database messages (raised with code P0001) are shown as-is.
export function failed(error: { message: string; code?: string } | null) {
  if (!error) return null;
  if (error.code === "23505") return { error: "That value is already used by another record." };
  if (error.code === "P0001") return { error: error.message };
  console.error(error);
  return { error: "Something went wrong. Please try again." };
}

export function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
