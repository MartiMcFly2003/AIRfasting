"use client";

import { useState } from "react";
import type { ISODate } from "@/lib/calendar";
import type { FastLog, FastPlan, FastType } from "@/lib/calendar/fast-plans";
import { CancelLink, DialogBody, DialogShell, DialogTitle, PrimaryButton, SecondaryButton } from "./DialogPrimitives";
import { DryFastIcon, FastClockIcon, WaterFastIcon } from "./PhaseIcons";

const FAST_TYPE_STYLE: Record<FastType, { label: string; ring: string; solidBg: string; text: string }> = {
  water: { label: "Water fast", ring: "ring-silver", solidBg: "bg-silver", text: "text-silver" },
  dry: { label: "Dry fast", ring: "ring-gold", solidBg: "bg-gold", text: "text-gold" },
};

function FastTypeButton({
  type,
  selected,
  onSelect,
}: {
  type: FastType;
  selected: boolean;
  onSelect: () => void;
}) {
  const style = FAST_TYPE_STYLE[type];
  const Icon = type === "water" ? WaterFastIcon : DryFastIcon;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-3 py-3 font-accent text-xs transition-colors ${
        selected ? `${style.solidBg} border-transparent text-obsidian` : `border-ivory/20 text-ivory hover:bg-ivory/10`
      }`}
    >
      <Icon className={`h-5 w-5 ${selected ? "text-obsidian" : style.text}`} />
      {style.label}
    </button>
  );
}

function dateRangeLabel(dates: ISODate[]): string {
  if (dates.length === 1) return dates[0];
  return `${dates[0]} – ${dates[dates.length - 1]}`;
}

export interface PlanFastDialogProps {
  /** 1+ contiguous dates from a single click or a committed drag range. */
  dates: ISODate[];
  /** "Rise" or "Radiate" — for title/body copy. */
  blockLabel: string;
  /** Set when editing a single already-planned day. */
  existingPlan?: FastPlan;
  onConfirm: (fastType: FastType, plannedHours: number | null) => void;
  onRemove?: () => void;
  onCancel: () => void;
}

export function PlanFastDialog({ dates, blockLabel, existingPlan, onConfirm, onRemove, onCancel }: PlanFastDialogProps) {
  const [fastType, setFastType] = useState<FastType | null>(existingPlan?.fastType ?? null);
  const [hours, setHours] = useState(existingPlan?.plannedHours != null ? String(existingPlan.plannedHours) : "");

  function handleSave() {
    if (!fastType) return;
    const parsedHours = hours.trim() === "" ? null : Number(hours);
    onConfirm(fastType, parsedHours !== null && Number.isFinite(parsedHours) && parsedHours > 0 ? parsedHours : null);
  }

  return (
    <DialogShell>
      <DialogTitle>
        {existingPlan ? "Edit your planned fast" : `Plan a fast — ${dateRangeLabel(dates)}`}
      </DialogTitle>
      <DialogBody>
        {dates.length > 1
          ? `Applies the same choice to all ${dates.length} selected ${blockLabel} days.`
          : `A ${blockLabel} day — fasting is supportive here if you'd like to plan one.`}
      </DialogBody>

      <div className="mt-4 flex gap-2">
        <FastTypeButton type="water" selected={fastType === "water"} onSelect={() => setFastType("water")} />
        <FastTypeButton type="dry" selected={fastType === "dry"} onSelect={() => setFastType("dry")} />
      </div>

      <label className="mt-4 flex items-center gap-2 rounded-lg border border-ivory/20 px-3 py-2">
        <FastClockIcon className="h-4 w-4 shrink-0 text-silver" />
        <input
          type="number"
          min={1}
          max={72}
          placeholder="Optional target hours"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="w-full bg-transparent font-body text-sm text-ivory placeholder:text-silver/60 focus:outline-none"
        />
      </label>

      <div className="mt-5 flex flex-col gap-2">
        <PrimaryButton onClick={handleSave} disabled={!fastType}>
          Save plan
        </PrimaryButton>
        {onRemove && <SecondaryButton onClick={onRemove}>Remove plan</SecondaryButton>}
        <CancelLink onClick={onCancel}>Cancel</CancelLink>
      </div>
    </DialogShell>
  );
}

export interface LogActualHoursDialogProps {
  plan: FastPlan;
  existingLog?: FastLog;
  onConfirm: (actualMinutes: number) => void;
  onRemove?: () => void;
  onCancel: () => void;
}

export function LogActualHoursDialog({ plan, existingLog, onConfirm, onRemove, onCancel }: LogActualHoursDialogProps) {
  const initialMinutes = existingLog?.actualMinutes ?? 0;
  const [hours, setHours] = useState(String(Math.floor(initialMinutes / 60)));
  const [minutes, setMinutes] = useState(String(initialMinutes % 60));

  function handleSave() {
    const h = Number(hours) || 0;
    const m = Number(minutes) || 0;
    const total = h * 60 + m;
    if (total <= 0) return;
    onConfirm(total);
  }

  const style = FAST_TYPE_STYLE[plan.fastType];

  return (
    <DialogShell>
      <DialogTitle>Log your fast — {plan.plannedDate}</DialogTitle>
      <DialogBody>
        You planned a{plan.plannedHours ? ` ${plan.plannedHours}h` : ""}{" "}
        <span className={style.text}>{style.label.toLowerCase()}</span>. How long did it actually run?
      </DialogBody>

      <div className="mt-4 flex items-center gap-2">
        <FastClockIcon className="h-4 w-4 shrink-0 text-silver" />
        <input
          type="number"
          min={0}
          max={72}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="w-16 rounded-lg border border-ivory/20 bg-transparent px-2 py-2 text-center font-body text-sm text-ivory focus:outline-none"
        />
        <span className="font-body text-sm text-silver">h</span>
        <input
          type="number"
          min={0}
          max={59}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="w-16 rounded-lg border border-ivory/20 bg-transparent px-2 py-2 text-center font-body text-sm text-ivory focus:outline-none"
        />
        <span className="font-body text-sm text-silver">min</span>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <PrimaryButton onClick={handleSave}>Save</PrimaryButton>
        {onRemove && <SecondaryButton onClick={onRemove}>Remove log</SecondaryButton>}
        <CancelLink onClick={onCancel}>Cancel</CancelLink>
      </div>
    </DialogShell>
  );
}

export interface StartFastDialogProps {
  initialFastType?: FastType;
  /** Shown in body copy when this fast will link to an existing plan, e.g. "today's planned water fast". */
  linkedPlanLabel?: string;
  onConfirm: (fastType: FastType) => void;
  onCancel: () => void;
}

export function StartFastDialog({ initialFastType, linkedPlanLabel, onConfirm, onCancel }: StartFastDialogProps) {
  const [fastType, setFastType] = useState<FastType | null>(initialFastType ?? null);

  return (
    <DialogShell>
      <DialogTitle>Start a fast</DialogTitle>
      <DialogBody>
        {linkedPlanLabel ? `This will log against ${linkedPlanLabel}.` : "Choose a type to start tracking now."}
      </DialogBody>

      <div className="mt-4 flex gap-2">
        <FastTypeButton type="water" selected={fastType === "water"} onSelect={() => setFastType("water")} />
        <FastTypeButton type="dry" selected={fastType === "dry"} onSelect={() => setFastType("dry")} />
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <PrimaryButton onClick={() => fastType && onConfirm(fastType)} disabled={!fastType}>
          Start
        </PrimaryButton>
        <CancelLink onClick={onCancel}>Cancel</CancelLink>
      </div>
    </DialogShell>
  );
}
