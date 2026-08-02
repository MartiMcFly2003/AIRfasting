import { createClient } from "@/lib/supabase/client";
import type { ISODate } from "@/lib/calendar";

/** Diffs `next` against `previous` and syncs just the difference — same pattern as
 *  syncPeriodHistory. Each entry is the first-of-month ISODate (e.g. "2026-06-01"). */
export async function syncNoPeriodMonths(
  userId: string,
  previous: ISODate[],
  next: ISODate[],
): Promise<void> {
  const previousSet = new Set(previous);
  const nextSet = new Set(next);
  const removed = previous.filter((month) => !nextSet.has(month));
  const added = next.filter((month) => !previousSet.has(month));
  if (removed.length === 0 && added.length === 0) return;

  const supabase = createClient();
  const [deleteResult, upsertResult] = await Promise.all([
    removed.length > 0
      ? supabase.from("no_period_months").delete().eq("user_id", userId).in("month_date", removed)
      : Promise.resolve({ error: null }),
    added.length > 0
      ? supabase
          .from("no_period_months")
          .upsert(
            added.map((month_date) => ({ user_id: userId, month_date })),
            { onConflict: "user_id,month_date" },
          )
      : Promise.resolve({ error: null }),
  ]);

  if (deleteResult.error) throw deleteResult.error;
  if (upsertResult.error) throw upsertResult.error;
}
