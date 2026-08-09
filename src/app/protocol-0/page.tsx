import Link from "next/link";

/** Reached only via the onboarding wizard's pregnancy gate — a hard medical contraindication
 *  with no self-attestation override, unlike the ED/binge safety gate (see CoachGateScreen,
 *  which stays inline in the wizard instead of navigating here). */
export default function ProtocolZeroPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <h1 className="font-heading text-4xl tracking-wide text-ivory">Let&apos;s take care of this first</h1>
      <p className="max-w-md font-body text-base leading-relaxed text-silver">
        Thank you for letting us know. Fasting isn&apos;t recommended during pregnancy or while
        trying to conceive, so we&apos;re holding off on generating your fasting calendar for
        now. Please check with your doctor if you have questions — and come back any time once
        that&apos;s changed, we&apos;d love to have you.
      </p>
      <Link href="/" className="mt-4 font-accent text-sm text-silver hover:text-ivory hover:underline">
        Back to home
      </Link>
    </main>
  );
}
