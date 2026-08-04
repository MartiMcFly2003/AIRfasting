import Link from "next/link";
import { PHASE_ICONS } from "@/components/calendar/PhaseIcons";
import type { PhaseBlockName } from "@/lib/calendar";

const PHASE_PILLS: { block: PhaseBlockName; bg: string }[] = [
  { block: "inhale", bg: "bg-phase-inhale" },
  { block: "bloom", bg: "bg-phase-bloom" },
  { block: "radiate", bg: "bg-phase-radiate" },
  { block: "exhale", bg: "bg-phase-exhale" },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-heading text-5xl tracking-wide text-ivory">AIRfasting</h1>
      <p className="max-w-md font-body text-lg text-silver">
        A cycle-aware fasting calendar &mdash; plan fasting days around your
        body&rsquo;s rhythm, whatever stage of life you&rsquo;re in.
      </p>
      <div aria-hidden="true" className="flex gap-3 pt-4">
        {PHASE_PILLS.map(({ block, bg }) => {
          const Icon = PHASE_ICONS[block];
          return (
            <span
              key={block}
              className={`flex h-10 w-[68px] items-center justify-center rounded-full ${bg}`}
            >
              <Icon className="h-[22px] w-[22px] text-obsidian" strokeWidth={1.9} />
            </span>
          );
        })}
      </div>
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
