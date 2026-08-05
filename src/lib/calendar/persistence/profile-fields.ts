import { createClient } from "@/lib/supabase/client";
import type { Track } from "@/lib/calendar";
import type { PauseReason } from "@/components/calendar/PauseDialogs";

export async function saveTrack(userId: string, track: Track): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("user_profiles").update({ track }).eq("user_id", userId);
  if (error) throw error;
}

/** `pause: null` clears paused_reason — matches the app's model exactly (presence of the
 *  object is the "is paused" flag, no separate boolean or timestamp). */
export async function savePauseState(
  userId: string,
  pause: { reason: PauseReason } | null,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({ paused_reason: pause?.reason ?? null })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function saveCycleLength(userId: string, cycleLength: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({ cycle_length: cycleLength })
    .eq("user_id", userId);
  if (error) throw error;
}
