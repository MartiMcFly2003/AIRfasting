"use client";

import { useState } from "react";
import type { ISODate } from "@/lib/calendar";
import type { FastLog, FastPlan, FastType } from "@/lib/calendar/fast-plans";
import {
  computeFastEnd,
  DRY_DISCLAIMER_THRESHOLD_HOURS,
  REFEED_THRESHOLD_HOURS,
  type RefeedDayInfo,
} from "@/lib/calendar/refeed";
import { CancelLink, DialogBody, DialogShell, DialogTitle, PrimaryButton, SecondaryButton } from "./DialogPrimitives";
import { DryFastIcon, FastClockIcon, WaterFastIcon } from "./PhaseIcons";

function formatDateLabel(date: ISODate): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

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
  /** Preselects the fast-type picker — used when opening this dialog via the dry→water
   *  refeed exception, where planning a water fast is the whole point of the exception. */
  initialFastType?: FastType;
  onConfirm: (fastType: FastType, plannedHours: number, startTime: string) => void;
  onRemove?: () => void;
  onCancel: () => void;
}

export function PlanFastDialog({
  dates,
  blockLabel,
  existingPlan,
  initialFastType,
  onConfirm,
  onRemove,
  onCancel,
}: PlanFastDialogProps) {
  const [step, setStep] = useState<"form" | "disclaimer">("form");
  const [fastType, setFastType] = useState<FastType | null>(existingPlan?.fastType ?? initialFastType ?? null);
  const [hours, setHours] = useState(existingPlan?.plannedHours != null ? String(existingPlan.plannedHours) : "");
  const [startTime, setStartTime] = useState(existingPlan?.startTime ?? "");

  const parsedHours = hours.trim() === "" ? null : Number(hours);
  const validHours = parsedHours !== null && Number.isFinite(parsedHours) && parsedHours > 0;
  const isLongFast = validHours && parsedHours! >= REFEED_THRESHOLD_HOURS;
  // Saving several 20h+ fasts on consecutive days in one drag-range action would create
  // back-to-back long fasts with no refeed between them — exactly what refeed blocking exists
  // to prevent. A long fast can only be planned one day at a time.
  const multiDayLongFastBlocked = isLongFast && dates.length > 1;
  const canSave = !!fastType && startTime.trim() !== "" && validHours && !multiDayLongFastBlocked;

  const endPreview =
    dates.length === 1 && fastType && startTime.trim() !== "" && validHours
      ? computeFastEnd(dates[0], startTime, parsedHours!)
      : null;

  function handleSaveClick() {
    if (!canSave || !fastType) return;
    if (fastType === "dry" && parsedHours! >= DRY_DISCLAIMER_THRESHOLD_HOURS) {
      setStep("disclaimer");
      return;
    }
    onConfirm(fastType, parsedHours!, startTime);
  }

  if (step === "disclaimer") {
    return (
      <DialogShell>
        <DialogTitle>Extended dry fasting</DialogTitle>
        <DialogBody>
          {`Dry fasts of ${DRY_DISCLAIMER_THRESHOLD_HOURS} hours or longer are for experienced fasters only. Make sure you've prepared properly beforehand, and follow proper refeeding guidelines afterward — your body needs both to handle a fast this long safely.`}
        </DialogBody>
        <div className="mt-5 flex flex-col gap-2">
          <PrimaryButton onClick={() => fastType && onConfirm(fastType, parsedHours!, startTime)}>
            I understand, save plan
          </PrimaryButton>
          <CancelLink onClick={() => setStep("form")}>Back</CancelLink>
        </div>
      </DialogShell>
    );
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
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="w-full bg-transparent font-body text-sm text-ivory [color-scheme:dark] focus:outline-none"
        />
      </label>

      <label className="mt-2 flex items-center gap-2 rounded-lg border border-ivory/20 px-3 py-2">
        <FastClockIcon className="h-4 w-4 shrink-0 text-silver" />
        <input
          type="number"
          min={1}
          max={72}
          placeholder="Target hours"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="w-full bg-transparent font-body text-sm text-ivory placeholder:text-silver/60 focus:outline-none"
        />
      </label>

      {endPreview && (
        <p className="mt-2 font-accent text-xs text-silver">
          Ends {formatDateLabel(endPreview.endDate)} at {formatTimeLabel(endPreview.endTime)}
        </p>
      )}

      {multiDayLongFastBlocked && (
        <p className="mt-2 font-accent text-xs text-coral">
          Fasts of {REFEED_THRESHOLD_HOURS}h or longer need their own refeed period afterward — plan one day at a
          time for a fast this long.
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2">
        <PrimaryButton onClick={handleSaveClick} disabled={!canSave}>
          Save plan
        </PrimaryButton>
        {onRemove && <SecondaryButton onClick={onRemove}>Remove plan</SecondaryButton>}
        <CancelLink onClick={onCancel}>Cancel</CancelLink>
      </div>
    </DialogShell>
  );
}

export interface RefeedInfoDialogProps {
  date: ISODate;
  info: RefeedDayInfo;
  /** Only offered when info.sourceFastType is "dry" — the whole point of the exception. */
  onPlanWaterFastException?: () => void;
  onClose: () => void;
}

export function RefeedInfoDialog({ date, info, onPlanWaterFastException, onClose }: RefeedInfoDialogProps) {
  const allowException = info.sourceFastType === "dry" && !!onPlanWaterFastException;

  return (
    <DialogShell>
      <p className="font-accent text-xs uppercase tracking-wider text-gold">{formatDateLabel(date)}</p>
      <div className="mt-1">
        <DialogTitle>Refeed day</DialogTitle>
      </div>
      <DialogBody>
        {`This day follows a ${info.sourceFastType} fast of ${REFEED_THRESHOLD_HOURS} hours or more, so it's set aside for refeeding — reintroducing food gradually rather than jumping straight back to normal meals. Start light (broth, soft fruit, small portions) and build back up over the next day or two. This block runs through ${formatDateLabel(info.refeedUntil)}.`}
        {allowException &&
          " Following a dry fast with a water fast is an exception to this block, if you'd like to plan one here."}
      </DialogBody>
      <div className="mt-5 flex flex-col gap-2">
        {allowException && (
          <SecondaryButton onClick={onPlanWaterFastException}>Plan a water fast here instead</SecondaryButton>
        )}
        <CancelLink onClick={onClose}>Close</CancelLink>
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
