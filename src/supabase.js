import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export async function createOrder(order) {
  const { data, error } = await supabase
    .from("orders")
    .insert(order)
    .select("id, created_at")
    .single();

  if (error) throw error;
  return data;
}
