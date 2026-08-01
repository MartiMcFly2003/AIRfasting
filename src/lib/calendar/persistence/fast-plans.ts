import { createClient } from "@/lib/supabase/client";
import type { FastPlan } from "@/lib/calendar/fast-plans";

/** Inserts one or more new plans (a drag-range plans several dates at once, each with its
 *  own client-generated id already set on the FastPlan objects). */
export async function insertFastPlans(userId: string, plans: FastPlan[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("fast_plans").insert(
    plans.map((plan) => ({
      id: plan.id,
      user_id: userId,
      planned_date: plan.plannedDate,
      fast_type: plan.fastType,
      planned_hours: plan.plannedHours,
    })),
  );
  if (error) throw error;
}

export async function updateFastPlan(userId: string, plan: FastPlan): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("fast_plans")
    .update({ fast_type: plan.fastType, planned_hours: plan.plannedHours })
    .eq("id", plan.id)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Relies on the fast_plans -> fast_logs FK's `on delete cascade` to remove the linked log
 *  server-side too — no separate log-delete call needed. */
export async function deleteFastPlan(userId: string, planId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("fast_plans").delete().eq("id", planId).eq("user_id", userId);
  if (error) throw error;
}
