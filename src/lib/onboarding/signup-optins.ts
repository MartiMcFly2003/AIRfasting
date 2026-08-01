const STORAGE_KEY = "airfasting_signup_optins";

export interface SignupOptIns {
  marketingOptIn: boolean;
  notificationsOptIn: boolean;
}

/** user_profiles doesn't exist yet at sign-up time (created at the end of onboarding), so the
 *  two optional opt-in checkboxes on SignUpForm ride across the /onboarding redirect via
 *  sessionStorage rather than a second write path — consumed once by OnboardingWizard. */
export function saveSignupOptIns(optIns: SignupOptIns): void {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(optIns));
}

export function consumeSignupOptIns(): SignupOptIns {
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
  if (!raw) return { marketingOptIn: false, notificationsOptIn: false };
  try {
    const parsed = JSON.parse(raw);
    return {
      marketingOptIn: parsed.marketingOptIn === true,
      notificationsOptIn: parsed.notificationsOptIn === true,
    };
  } catch {
    return { marketingOptIn: false, notificationsOptIn: false };
  }
}
