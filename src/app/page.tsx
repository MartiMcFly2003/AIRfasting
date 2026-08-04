import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-heading text-5xl tracking-wide text-ivory">AIRfasting</h1>
      <p className="max-w-md font-body text-lg text-silver">
        A cycle-aware fasting calendar &mdash; plan fasting days around your
        body&rsquo;s rhythm, whatever stage of life you&rsquo;re in.
      </p>
      <div className="flex gap-4 pt-6">
        <Link
          href="/sign-up"
          className="rounded-full bg-coral px-5 py-2 font-accent text-sm font-medium text-obsidian transition-opacity hover:opacity-90"
        >
          Sign up
        </Link>
        <Link
          href="/log-in"
          className="rounded-full border border-ivory/20 px-5 py-2 font-accent text-sm text-ivory transition-colors hover:bg-ivory/10"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
