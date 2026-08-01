import Link from "next/link";

export default function ProtocolZeroPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <h1 className="font-heading text-4xl tracking-wide text-ivory">Let&apos;s take care of this first</h1>
      <p className="max-w-md font-body text-base leading-relaxed text-silver">
        Thank you for being honest with us. Based on what you shared, we&apos;d rather start with
        a real conversation than a calendar. AIRfasting works best alongside proper support when
        food and fasting have felt complicated before — so we&apos;re holding off on generating
        your fasting calendar for now.
      </p>
      <p className="max-w-md font-body text-base leading-relaxed text-silver">
        Reach out any time and we&apos;ll arrange a 1:1 session to figure out what&apos;s right
        for you:{" "}
        <a href="mailto:support@airfasting.com" className="text-gold hover:underline">
          support@airfasting.com
        </a>
      </p>
      <Link href="/" className="mt-4 font-accent text-sm text-silver hover:text-ivory hover:underline">
        Back to home
      </Link>
    </main>
  );
}
