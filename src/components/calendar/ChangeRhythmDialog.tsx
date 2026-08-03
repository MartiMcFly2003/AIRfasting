"use client";

import type { Track } from "@/lib/calendar";
import { CancelLink, DialogBody, DialogShell, DialogTitle, SecondaryButton } from "./DialogPrimitives";

/** The 3 manually-selectable rhythms — collapses the 6 onboarding-only track values
 *  (moon_sync_bridging, gentle_starter, no_cycle) onto whichever of these 3 shares their
 *  protocol, since those finer distinctions only matter for onboarding's automatic derivation. */
export type FastingRhythmOption = "menstrual" | "moon_sync" | "weekly_rhythm";

const RHYTHM_OPTIONS: { track: FastingRhythmOption; label: string }[] = [
  { track: "menstrual", label: "Cycling women — regular cycle, calendar follows your period" },
  { track: "moon_sync", label: "Perimenopausal women — irregular cycle, calendar follows the moon instead" },
  { track: "weekly_rhythm", label: "Menopausal women / men — no cycle, calendar follows a fixed weekly rhythm" },
];

export interface ChangeRhythmDialogProps {
  currentTrack: Track;
  onChoose: (track: FastingRhythmOption) => void;
  onCancel: () => void;
}

export function ChangeRhythmDialog({ currentTrack, onChoose, onCancel }: ChangeRhythmDialogProps) {
  return (
    <DialogShell>
      <DialogTitle>Change fasting rhythm</DialogTitle>
      <DialogBody>Choose whichever of these best matches you right now.</DialogBody>
      <div className="mt-5 flex flex-col gap-2">
        {RHYTHM_OPTIONS.map(({ track, label }) => {
          const isCurrent = currentTrack === track;
          return (
            <SecondaryButton key={track} onClick={() => onChoose(track)} disabled={isCurrent}>
              {label}
              {isCurrent ? " (current)" : ""}
            </SecondaryButton>
          );
        })}
        <CancelLink onClick={onCancel}>Cancel</CancelLink>
      </div>
    </DialogShell>
  );
}
