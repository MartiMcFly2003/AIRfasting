"use client";

import { useState } from "react";
import type { ISODate } from "@/lib/calendar";
import { CancelLink, DialogBody, DialogShell, DialogTitle, PrimaryButton, SecondaryButton } from "./DialogPrimitives";

export interface DateEntryDialogProps {
  title: string;
  description: string;
  initialDate: ISODate;
  /** Earliest selectable date, inclusive. Omit for no lower bound. */
  min?: ISODate;
  /** Latest selectable date, inclusive. */
  max: ISODate;
  confirmLabel: string;
  onConfirm: (date: ISODate) => void;
  onCancel: () => void;
  /** When set, shows an "Undo logging of period" option that reverts to the pre-log state. */
  onUndo?: () => void;
}

export function DateEntryDialog({
  title,
  description,
  initialDate,
  min,
  max,
  confirmLabel,
  onConfirm,
  onCancel,
  onUndo,
}: DateEntryDialogProps) {
  const [date, setDate] = useState(initialDate);

  return (
    <DialogShell>
      <DialogTitle>{title}</DialogTitle>
      <DialogBody>{description}</DialogBody>
      <input
        type="date"
        value={date}
        min={min}
        max={max}
        onChange={(e) => setDate(e.target.value)}
        className="mt-4 w-full rounded-lg border border-ivory/20 bg-transparent px-3 py-2 font-body text-sm text-ivory [color-scheme:dark]"
      />
      <div className="mt-5 flex flex-col gap-2">
        <PrimaryButton onClick={() => onConfirm(date)} disabled={min !== undefined && date < min}>
          {confirmLabel}
        </PrimaryButton>
        {onUndo && <SecondaryButton onClick={onUndo}>Undo logging of period</SecondaryButton>}
        <CancelLink onClick={onCancel}>Cancel</CancelLink>
      </div>
    </DialogShell>
  );
}

export interface CycleDeviationDialogProps {
  usualCycleLength: number;
  newCycleLength: number;
  /** Average of the last 3 logged cycles — omit or pass null when fewer than 3 exist yet, to hide the option. */
  averageCycleLength?: number | null;
  onChoose: (choice: "usual" | "new" | "average") => void;
  onCancel: () => void;
}

export function CycleDeviationDialog({
  usualCycleLength,
  newCycleLength,
  averageCycleLength,
  onChoose,
  onCancel,
}: CycleDeviationDialogProps) {
  return (
    <DialogShell>
      <DialogTitle>A different rhythm this month</DialogTitle>
      <DialogBody>
        I noticed your cycle this month was {newCycleLength} days, which deviates from your
        indicated usual cycle length during onboarding. Shall I use for your cycle this month your
        usual cycle length of {usualCycleLength} days, or the new one of {newCycleLength} days?
      </DialogBody>
      <div className="mt-5 flex flex-col gap-2">
        <PrimaryButton onClick={() => onChoose("new")}>
          Use new length ({newCycleLength} days)
        </PrimaryButton>
        {averageCycleLength != null && (
          <SecondaryButton onClick={() => onChoose("average")}>
            Use average of last 3 months ({averageCycleLength} days)
          </SecondaryButton>
        )}
        <SecondaryButton onClick={() => onChoose("usual")}>
          Use usual length ({usualCycleLength} days)
        </SecondaryButton>
        <CancelLink onClick={onCancel}>Cancel</CancelLink>
      </div>
    </DialogShell>
  );
}
