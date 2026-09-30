import type { Finding } from "@/lib/billing/reconcile";

function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * The daily reconciliation report, sent only when something disagrees.
 *
 * Silence is the signal: a report that arrives every morning saying "all well" is one nobody
 * reads by the second week, and the one morning it says otherwise it looks like the others.
 *
 * Findings that cost money are listed first because they are the ones that stay wrong quietly.
 * A customer denied access they paid for will write in within a day; nobody ever reports having
 * been given Premium for free.
 */
export function buildReconcileEmail(
  findings: Finding[],
  checked: number,
): { subject: string; html: string } {
  const costly = findings.filter((f) => f.costsMoney);
  const rest = findings.filter((f) => !f.costsMoney);

  const subject =
    costly.length > 0
      ? `AIRfasting: ${costly.length} account${costly.length === 1 ? "" : "s"} with Premium and no payment`
      : `AIRfasting: ${findings.length} billing mismatch${findings.length === 1 ? "" : "es"}`;

  const section = (title: string, items: Finding[]) =>
    items.length === 0
      ? ""
      : `<h3 style="margin:18px 0 6px">${title}</h3><ul>${items
          .map((f) => `<li><strong>${escape(f.subject)}</strong> — ${escape(f.detail)}</li>`)
          .join("")}</ul>`;

  const html = `
    <p>The daily check against Stripe found ${findings.length} thing${
      findings.length === 1 ? "" : "s"
    } that don't match, across ${checked} account${checked === 1 ? "" : "s"}.</p>
    ${section("Premium without payment", costly)}
    ${section("Other mismatches", rest)}
    <p style="margin-top:18px">Stripe is the authority here — where the two disagree, Stripe is
    right and this app is wrong. Nothing has been changed automatically.</p>
  `.trim();

  return { subject, html };
}
