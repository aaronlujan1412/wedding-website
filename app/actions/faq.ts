"use server";
import { supabase } from "@/lib/supabase";

export async function getFaqs() {
  return await supabase.from("faq").select().order("sort_order");
}
