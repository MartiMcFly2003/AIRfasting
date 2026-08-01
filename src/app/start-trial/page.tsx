import { redirect } from "next/navigation";
import { StartTrialScreen } from "@/components/billing/StartTrialScreen";
import { createClient } from "@/lib/supabase/server";

export default async function StartTrialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/log-in");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("track, role")
    .eq("user_id", user.id)
    .single();

  if (!profile?.track) redirect("/onboarding");
  if (profile.role === "premium") redirect("/calendar");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <StartTrialScreen />
    </main>
  );
}
