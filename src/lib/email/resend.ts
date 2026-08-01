export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

/** Plain fetch to Resend's API — no new npm dependency, matches this codebase's existing
 *  minimal-footprint style for third-party clients (see src/lib/stripe/client.ts). Used for
 *  transactional emails triggered by app logic (like the trial-reminder cron), which can't go
 *  through Supabase Auth's own email system since they're not auth events. */
export async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
  }
}
