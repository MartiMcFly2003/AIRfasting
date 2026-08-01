"use client";

import { CancelLink, DialogBody, DialogShell, DialogTitle, PrimaryButton, SecondaryButton } from "./DialogPrimitives";

export type PauseReason = "unsure" | "other";

export interface IrregularPeriodDialogProps {
  onChoosePause: (reason: PauseReason) => void;
  onChooseSwitchToMoonSync: () => void;
  onCancel: () => void;
}

export function IrregularPeriodDialog({
  onChoosePause,
  onChooseSwitchToMoonSync,
  onCancel,
}: IrregularPeriodDialogProps) {
  return (
    <DialogShell>
      <DialogTitle>Your period is late</DialogTitle>
      <DialogBody>We&apos;re not recommending fasting right now — please rule out pregnancy first.</DialogBody>
      <div className="mt-5 flex flex-col gap-2">
        <SecondaryButton onClick={() => onChoosePause("unsure")}>
          I&apos;m unsure of the reasons, pause fasting for now
        </SecondaryButton>
        <SecondaryButton onClick={onChooseSwitchToMoonSync}>
          Period is irregular due to perimenopause, change to moon based calendar
        </SecondaryButton>
        <SecondaryButton onClick={() => onChoosePause("other")}>
          Period is irregular due to other reasons, pause fasting for now
        </SecondaryButton>
        <CancelLink onClick={onCancel}>Not now</CancelLink>
      </div>
    </DialogShell>
  );
}

export interface UnpauseDialogProps {
  onChooseRegular: () => void;
  onChoosePerimenopause: () => void;
  onCancel: () => void;
}

export function UnpauseDialog({ onChooseRegular, onChoosePerimenopause, onCancel }: UnpauseDialogProps) {
  return (
    <DialogShell>
      <DialogTitle>Unpause fasting</DialogTitle>
      <DialogBody>Fasting is currently paused. What would you like to do?</DialogBody>
      <div className="mt-5 flex flex-col gap-2">
        <PrimaryButton onClick={onChooseRegular}>
          I have a regular period again, unpause period based fasting plan
        </PrimaryButton>
        <SecondaryButton onClick={onChoosePerimenopause}>
          I have irregular periods due to perimenopause, unpause moon based fasting plan
        </SecondaryButton>
        <CancelLink onClick={onCancel}>Cancel</CancelLink>
      </div>
    </DialogShell>
  );
}

const PAUSE_REASON_COPY: Record<PauseReason, string> = {
  unsure: "reason unclear, rule out pregnancy first",
  other: "irregular cycle",
};

export interface PauseStatusStripProps {
  reason: PauseReason;
}

export function PauseStatusStrip({ reason }: PauseStatusStripProps) {
  return (
    <div className="w-full max-w-xl rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-center font-body text-sm text-ivory">
      Fasting paused — {PAUSE_REASON_COPY[reason]} · tap your period marker to unpause
    </div>
  );
}
