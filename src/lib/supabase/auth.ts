import { createClient } from "./client";

export interface SignUpOptIns {
  marketingOptIn: boolean;
  notificationsOptIn: boolean;
}

/** The opt-ins go into auth user metadata rather than travelling with the client, because
 *  email confirmation means the tab that ticked the boxes is rarely the tab that reaches
 *  onboarding — anything held browser-side is lost in between. */
export async function signUpWithPassword(
  email: string,
  password: string,
  optIns: SignUpOptIns,
) {
  const supabase = createClient();
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        marketing_opt_in: optIns.marketingOptIn,
        notifications_opt_in: optIns.notificationsOptIn,
      },
    },
  });
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  const supabase = createClient();
  return supabase.auth.signOut();
}

export async function requestPasswordReset(email: string, redirectTo: string) {
  const supabase = createClient();
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient();
  return supabase.auth.updateUser({ password: newPassword });
}

export async function verifyPasswordResetCode(email: string, token: string) {
  const supabase = createClient();
  return supabase.auth.verifyOtp({ email, token, type: "recovery" });
}
