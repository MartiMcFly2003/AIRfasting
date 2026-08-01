import { createClient } from "@/lib/supabase/client";
import type { ISODate } from "@/lib/calendar";

/** Diffs `next` against `previous` (both already in memory — no DB read needed) and syncs
 *  just the difference. Handles every call site uniformly: a plain append (log period start),
 *  a replace-last (adjust), and a revert-to-snapshot (undo) are all just "some dates removed,
 *  some added" from this function's point of view. */
export async function syncPeriodHistory(
  userId: string,
  previous: ISODate[],
  next: ISODate[],
): Promise<void> {
  const previousSet = new Set(previous);
  const nextSet = new Set(next);
  const removed = previous.filter((date) => !nextSet.has(date));
  const added = next.filter((date) => !previousSet.has(date));
  if (removed.length === 0 && added.length === 0) return;

  const supabase = createClient();
  const [deleteResult, upsertResult] = await Promise.all([
    removed.length > 0
      ? supabase.from("period_logs").delete().eq("user_id", userId).in("period_date", removed)
      : Promise.resolve({ error: null }),
    added.length > 0
      ? supabase
          .from("period_logs")
          .upsert(
            added.map((period_date) => ({ user_id: userId, period_date })),
            { onConflict: "user_id,period_date" },
          )
      : Promise.resolve({ error: null }),
  ]);

  if (deleteResult.error) throw deleteResult.error;
  if (upsertResult.error) throw upsertResult.error;
}
