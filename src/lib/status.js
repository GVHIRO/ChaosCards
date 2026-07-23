import { supabase } from "./supabase";

export async function updateStatus(userId, status) {
  if (!userId) return;

  await supabase
    .from("profiles")
    .update({ status })
    .eq("id", userId);
}