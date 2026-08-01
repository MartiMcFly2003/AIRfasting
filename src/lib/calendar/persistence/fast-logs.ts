import { createClient } from "@/lib/supabase/client";
import type { FastLog } from "@/lib/calendar/fast-plans";

/** Also what CalendarTrackManager's handleStopFast calls once a live fast ends — it already
 *  builds a complete FastLog (with its own client-generated id) from the stopped fast, so
 *  this is a straight passthrough, not a separate code path for live vs. manually-logged. */
export async function insertFastLog(userId: string, log: FastLog): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("fast_logs").insert({
    id: log.id,
    user_id: userId,
    plan_id: log.planId,
    logged_date: log.loggedDate,
    fast_type: log.fastType,
    planned_hours: log.plannedHours,
    actual_minutes: log.actualMinutes,
  });
  if (error) throw error;
}

export async function updateFastLog(userId: string, log: FastLog): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("fast_logs")
    .update({ actual_minutes: log.actualMinutes })
    .eq("id", log.id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteFastLog(userId: string, logId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("fast_logs").delete().eq("id", logId).eq("user_id", userId);
  if (error) throw error;
}
