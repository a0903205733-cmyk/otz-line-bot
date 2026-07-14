import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export async function createOrder(values) {
  const { data, error } = await db.from("orders").insert(values).select("*").single();
  if (error) throw error;
  return data;
}

export async function getOrder(id) {
  const { data, error } = await db.from("orders").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function listOrders() {
  const { data, error } = await db.from("orders").select("*").order("created_at", { ascending: false }).limit(300);
  if (error) throw error;
  return data;
}

export async function updateOrder(id, values) {
  const { data, error } = await db.from("orders").update(values).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}
