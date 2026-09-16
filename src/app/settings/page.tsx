import { redirect } from "next/navigation";
import Link from "next/link";
import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";
import { NotificationPreferencesSection } from "@/components/settings/NotificationPreferencesSection";
import { TimeZoneSection } from "@/components/settings/TimeZoneSection";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/log-in");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "subscription_status, notifications_opt_in, marketing_opt_in, timezone, home_timezone, timezone_reverts_on",
    )
    .eq("user_id", user.id)
    .single();

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-ivory/10 bg-obsidian p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <h1 className="font-heading text-2xl tracking-wide text-ivory">Account settings</h1>
        {profile && (
          <div className="mt-6">
            <NotificationPreferencesSection
              userId={user.id}
              initialNotificationsOptIn={profile.notifications_opt_in ?? false}
              initialMarketingOptIn={profile.marketing_opt_in ?? false}
            />
          </div>
        )}
        {profile && (
          <div className="mt-6 border-t border-ivory/10 pt-6">
            <TimeZoneSection
              userId={user.id}
              initialTimeZone={profile.timezone ?? null}
              initialHomeTimeZone={profile.home_timezone ?? null}
              initialRevertsOn={profile.timezone_reverts_on ?? null}
            />
          </div>
        )}
        <div className="mt-6 border-t border-ivory/10 pt-6">
          <DeleteAccountSection subscriptionStatus={profile?.subscription_status ?? null} />
        </div>
        <Link
          href="/calendar"
          className="mt-6 block text-center font-accent text-xs text-silver hover:text-ivory hover:underline"
        >
          Back to calendar
        </Link>
      </div>
    </main>
  );
}
