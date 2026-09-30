/**
 * Who may see the admin view.
 *
 * Driven by ADMIN_EMAIL — the same variable the reconciliation report is sent to — rather than
 * a role column, deliberately: a role would be one more piece of billing-adjacent state to
 * protect, and this needs no database at all. Accepts a comma-separated list, since the owner
 * has more than one account.
 *
 * Matching is case-insensitive and trimmed. Nothing else about the address is normalised: it is
 * compared as written, so an address that merely looks equivalent to a person is not equivalent
 * here. That is the safe direction for a gate.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const allowed = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) return false;
  return allowed.includes(email.trim().toLowerCase());
}
