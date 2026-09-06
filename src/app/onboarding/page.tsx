import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/log-in");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <OnboardingWizard
        userId={user.id}
        marketingOptIn={user.user_metadata?.marketing_opt_in === true}
        notificationsOptIn={user.user_metadata?.notifications_opt_in === true}
      />
    </main>
  );
}
