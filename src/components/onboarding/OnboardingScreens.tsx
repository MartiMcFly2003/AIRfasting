"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  DialogBody,
  DialogShell,
  DialogTitle,
  PrimaryButton,
  SecondaryButton,
} from "@/components/calendar/DialogPrimitives";
import type { Goal, HealthCondition, OnboardingAnswers } from "@/lib/onboarding/types";
import { ChoiceButton, InlineError } from "./OnboardingPrimitives";

export interface ScreenProps {
  answers: OnboardingAnswers;
  onChange: (patch: Partial<OnboardingAnswers>) => void;
}

function todayAsISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

const FIELD_LABEL = "font-accent text-xs uppercase tracking-wider text-silver";
const TEXT_INPUT =
  "mt-1 w-full rounded-lg border border-ivory/20 bg-transparent px-3 py-2 font-body text-sm text-ivory focus:outline-none [color-scheme:dark]";

export interface ConsentScreenProps extends ScreenProps {
  /** Bumped every time Next is pressed with something still unanswered. A counter rather than
   *  a flag so a second press re-points at the gap instead of doing nothing. */
  gapNudge?: number;
}

/** Transparent border when there's nothing to flag, so highlighting a gap doesn't shift the
 *  layout underneath the reader. */
function gapBox(missing: boolean): string {
  return `rounded-xl border p-3 transition-colors ${missing ? "border-coral" : "border-transparent"}`;
}

export function ConsentScreen({ answers, onChange, gapNudge = 0 }: ConsentScreenProps) {
  const showGaps = gapNudge > 0;
  const termsMissing = showGaps && answers.termsAccepted !== true;
  const healthMissing = showGaps && answers.healthDataConsent !== true;
  const marketingMissing = showGaps && answers.marketingOptIn == null;
  const firstGap = termsMissing
    ? "terms"
    : healthMissing
      ? "health"
      : marketingMissing
        ? "marketing"
        : null;

  // This screen is taller than most viewports and Next sits at the bottom of it, so whatever
  // is unanswered may well be off-screen at the moment they press it.
  const firstGapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (gapNudge > 0) firstGapRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [gapNudge]);

  return (
    <>
      <DialogTitle>Before we start</DialogTitle>
      <DialogBody>
        Two things we need your explicit agreement on, and two choices about what we send you.
      </DialogBody>
      <div className="mt-4 flex flex-col gap-3">
        <div ref={firstGap === "terms" ? firstGapRef : undefined} className={gapBox(termsMissing)}>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={answers.termsAccepted ?? false}
              onChange={(e) => onChange({ termsAccepted: e.target.checked })}
              className="mt-1"
            />
            <span className="font-body text-sm leading-relaxed text-silver">
              I have read and agree to AIRfasting&apos;s{" "}
              <Link href="/terms" target="_blank" className="text-ivory underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="text-ivory underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {termsMissing && (
            <InlineError>Please accept the Terms and Privacy Policy to continue.</InlineError>
          )}
        </div>
        <div ref={firstGap === "health" ? firstGapRef : undefined} className={gapBox(healthMissing)}>
          <p className="font-body text-sm leading-relaxed text-silver">
            AIRfasting helps you plan fasting around your body&apos;s natural rhythms. To do
            this, we need your explicit consent to process health-related information,
            including menstrual cycle data (or lunar-cycle preference), fasting history, and any
            wellness notes you choose to add. This is sensitive health information, and we only
            use it to provide your personalized plan — never for advertising, and never sold to
            third parties. You can withdraw this consent at any time in Settings.
          </p>
          <label className="mt-2 flex items-start gap-3">
            <input
              type="checkbox"
              checked={answers.healthDataConsent ?? false}
              onChange={(e) => onChange({ healthDataConsent: e.target.checked })}
              className="mt-1"
            />
            <span className="font-body text-sm leading-relaxed text-silver">
              I explicitly consent to AIRfasting processing my health and wellness data as
              described above and in the{" "}
              <Link href="/privacy" target="_blank" className="text-ivory underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {healthMissing && (
            <InlineError>
              We need this consent to build your plan &mdash; it works from health data.
            </InlineError>
          )}
        </div>

        {/* Yes/No rather than a tickbox: an untouched checkbox can't be told apart from a
            considered "no", and these two used to sit unnoticed on the sign-up form.
            Reminders start on "yes" because they're part of the service being signed up for;
            marketing deliberately starts empty, since a pre-selected answer isn't consent. */}
        <div className={gapBox(false)}>
          <p className={FIELD_LABEL}>Notifications in the app</p>
          <p className="mt-1 font-body text-sm leading-relaxed text-silver">
            Fasting reminders for your scheduled fasts. You can change this any time in
            Settings.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {OPT_IN_OPTIONS.map((opt) => (
              <ChoiceButton
                key={String(opt.value)}
                label={opt.label}
                selected={answers.notificationsOptIn === opt.value}
                onSelect={() => onChange({ notificationsOptIn: opt.value })}
              />
            ))}
          </div>
        </div>

        <div
          ref={firstGap === "marketing" ? firstGapRef : undefined}
          className={gapBox(marketingMissing)}
        >
          <p className={FIELD_LABEL}>Marketing emails</p>
          <p className="mt-1 font-body text-sm leading-relaxed text-silver">
            Wellness tips, product updates, and offers. You can unsubscribe at any time.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {OPT_IN_OPTIONS.map((opt) => (
              <ChoiceButton
                key={String(opt.value)}
                label={opt.label}
                selected={answers.marketingOptIn === opt.value}
                onSelect={() => onChange({ marketingOptIn: opt.value })}
              />
            ))}
          </div>
          {marketingMissing && (
            <InlineError>
              Please choose yes or no &mdash; we won&apos;t send anything without an answer.
            </InlineError>
          )}
        </div>
      </div>
    </>
  );
}

const OPT_IN_OPTIONS: { value: boolean; label: string }[] = [
  { value: true, label: "Yes, send these" },
  { value: false, label: "No thanks" },
];

const GENDER_OPTIONS: { value: NonNullable<OnboardingAnswers["gender"]>; label: string }[] = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "self_describe", label: "Prefer to self-describe" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export function IdentityScreen({ answers, onChange }: ScreenProps) {
  const ageTooYoung = answers.age != null && answers.age < 18;
  return (
    <>
      <DialogTitle>Let&apos;s get to know you</DialogTitle>
      <DialogBody>A couple of questions to tailor your calendar.</DialogBody>
      <div className="mt-4 flex flex-col gap-2">
        {GENDER_OPTIONS.map((opt) => (
          <ChoiceButton
            key={opt.value}
            label={opt.label}
            selected={answers.gender === opt.value}
            onSelect={() => onChange({ gender: opt.value })}
          />
        ))}
      </div>
      <label className="mt-4 block">
        <span className={FIELD_LABEL}>Age</span>
        <input
          type="number"
          min={0}
          value={answers.age ?? ""}
          onChange={(e) => onChange({ age: e.target.value === "" ? undefined : Number(e.target.value) })}
          className={TEXT_INPUT}
        />
      </label>
      {ageTooYoung && <InlineError>You must be 18 or older to use AIRfasting.</InlineError>}
    </>
  );
}

const CYCLE_STATUS_OPTIONS: { value: NonNullable<OnboardingAnswers["cycleStatus"]>; label: string }[] = [
  { value: "regular", label: "Regular" },
  { value: "irregular", label: "Irregular" },
  { value: "no_periods", label: "No longer have periods" },
  { value: "not_sure", label: "Not sure" },
];

const MONTHS_SINCE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Less than 1 month" },
  { value: 1, label: "1 month" },
  { value: 2, label: "2 months" },
  { value: 3, label: "3 months" },
  { value: 5, label: "4–6 months" },
  { value: 9, label: "7–11 months" },
  { value: 12, label: "1 year or more" },
];

export function CycleStatusScreen({ answers, onChange }: ScreenProps) {
  function selectStatus(value: NonNullable<OnboardingAnswers["cycleStatus"]>) {
    // Re-clicking the already-selected option shouldn't wipe out a follow-up answer.
    if (answers.cycleStatus === value) return;
    onChange({ cycleStatus: value, lastPeriodDate: null, monthsSinceLastPeriod: null });
  }

  return (
    <>
      <DialogTitle>Your cycle</DialogTitle>
      <DialogBody>This shapes which calendar rhythm we build for you.</DialogBody>
      <div className="mt-4 flex flex-col gap-2">
        {CYCLE_STATUS_OPTIONS.map((opt) => (
          <ChoiceButton
            key={opt.value}
            label={opt.label}
            selected={answers.cycleStatus === opt.value}
            onSelect={() => selectStatus(opt.value)}
          />
        ))}
      </div>

      {(answers.cycleStatus === "regular" || answers.cycleStatus === "irregular") && (
        <label className="mt-4 block">
          <span className={FIELD_LABEL}>First day of last period</span>
          <input
            type="date"
            max={todayAsISODate()}
            value={answers.lastPeriodDate ?? ""}
            onChange={(e) => onChange({ lastPeriodDate: e.target.value || null })}
            className={TEXT_INPUT}
          />
        </label>
      )}

      {answers.cycleStatus === "no_periods" && (
        <label className="mt-4 block">
          <span className={FIELD_LABEL}>Months since your last period</span>
          <select
            value={answers.monthsSinceLastPeriod ?? ""}
            onChange={(e) =>
              onChange({ monthsSinceLastPeriod: e.target.value === "" ? null : Number(e.target.value) })
            }
            className={TEXT_INPUT}
          >
            <option value="" disabled>
              Choose one
            </option>
            {MONTHS_SINCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}

const DRY_FASTING_OPTIONS: { value: NonNullable<OnboardingAnswers["triedDryFasting"]>; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "Not sure" },
];
const WATER_FASTING_OPTIONS: { value: NonNullable<OnboardingAnswers["triedWaterFasting"]>; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export function FastingExperienceScreen({ answers, onChange }: ScreenProps) {
  return (
    <>
      <DialogTitle>Fasting experience</DialogTitle>
      <DialogBody>No wrong answers — this just helps us pace things.</DialogBody>

      <p className={`mt-4 ${FIELD_LABEL}`}>Have you tried dry fasting before?</p>
      <div className="mt-2 flex flex-col gap-2">
        {DRY_FASTING_OPTIONS.map((opt) => (
          <ChoiceButton
            key={opt.value}
            label={opt.label}
            selected={answers.triedDryFasting === opt.value}
            onSelect={() => onChange({ triedDryFasting: opt.value })}
          />
        ))}
      </div>

      <p className={`mt-4 ${FIELD_LABEL}`}>Have you tried water fasting before?</p>
      <div className="mt-2 flex flex-col gap-2">
        {WATER_FASTING_OPTIONS.map((opt) => (
          <ChoiceButton
            key={opt.value}
            label={opt.label}
            selected={answers.triedWaterFasting === opt.value}
            onSelect={() => onChange({ triedWaterFasting: opt.value })}
          />
        ))}
      </div>
    </>
  );
}

const ED_HISTORY_OPTIONS: { value: NonNullable<OnboardingAnswers["edHistory"]>; label: string }[] = [
  { value: "current", label: "Yes, currently" },
  { value: "past_working_through", label: "Yes, in the past — still working through it" },
  { value: "past_recovered", label: "Yes, fully recovered" },
  { value: "no", label: "No" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];
const BINGE_EATING_OPTIONS: { value: NonNullable<OnboardingAnswers["bingeEating"]>; label: string }[] = [
  { value: "often", label: "Yes, often" },
  { value: "sometimes", label: "Sometimes" },
  { value: "rarely_never", label: "Rarely or never" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const HEALTH_CONDITION_OPTIONS: { value: HealthCondition; label: string }[] = [
  { value: "diabetes", label: "Diabetes or a blood sugar condition" },
  { value: "heart_condition", label: "Heart or cardiovascular condition" },
  { value: "kidney_disease", label: "Kidney disease" },
  { value: "breastfeeding", label: "Currently breastfeeding" },
  { value: "medication", label: "Taking medication that fasting could affect (e.g. insulin, blood pressure, blood thinners)" },
  { value: "other", label: "Another health condition" },
  { value: "none", label: "None of these" },
];

const PREGNANCY_OPTIONS: { value: NonNullable<OnboardingAnswers["pregnant"]>; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export function SafetyGateScreen({ answers, onChange }: ScreenProps) {
  const [showHealthWarning, setShowHealthWarning] = useState(false);
  const showsPregnancyQuestion = answers.gender === "woman" || answers.gender === "self_describe";
  const conditions = answers.healthConditions ?? [];

  function toggleCondition(condition: HealthCondition) {
    let next: HealthCondition[];
    if (condition === "none") {
      next = conditions.includes("none") ? [] : ["none"];
    } else {
      const withoutNone = conditions.filter((c) => c !== "none");
      next = withoutNone.includes(condition)
        ? withoutNone.filter((c) => c !== condition)
        : [...withoutNone, condition];
    }
    const hadConditionBefore = conditions.some((c) => c !== "none");
    const hasConditionNow = next.some((c) => c !== "none");
    onChange({ healthConditions: next });
    // Warn the moment a real condition is first checked, not on every subsequent toggle —
    // re-showing it for each additional box ticked would just be noise.
    if (!hadConditionBefore && hasConditionNow) setShowHealthWarning(true);
  }

  return (
    <>
      <DialogTitle>A couple of health questions</DialogTitle>
      <DialogBody>We ask everyone this — it helps us point you toward the right kind of support.</DialogBody>

      <p className={`mt-4 ${FIELD_LABEL}`}>Do you have a history of disordered eating?</p>
      <div className="mt-2 flex flex-col gap-2">
        {ED_HISTORY_OPTIONS.map((opt) => (
          <ChoiceButton
            key={opt.value}
            label={opt.label}
            selected={answers.edHistory === opt.value}
            onSelect={() => onChange({ edHistory: opt.value })}
          />
        ))}
      </div>

      <p className={`mt-4 ${FIELD_LABEL}`}>Do you experience binge eating?</p>
      <div className="mt-2 flex flex-col gap-2">
        {BINGE_EATING_OPTIONS.map((opt) => (
          <ChoiceButton
            key={opt.value}
            label={opt.label}
            selected={answers.bingeEating === opt.value}
            onSelect={() => onChange({ bingeEating: opt.value })}
          />
        ))}
      </div>

      <p className={`mt-4 ${FIELD_LABEL}`}>Do any of these apply to you?</p>
      <div className="mt-2 flex flex-col gap-2">
        {HEALTH_CONDITION_OPTIONS.map((opt) => (
          <ChoiceButton
            key={opt.value}
            label={opt.label}
            selected={conditions.includes(opt.value)}
            onSelect={() => toggleCondition(opt.value)}
          />
        ))}
      </div>

      {showsPregnancyQuestion && (
        <>
          <p className={`mt-4 ${FIELD_LABEL}`}>Are you currently pregnant?</p>
          <div className="mt-2 flex flex-col gap-2">
            {PREGNANCY_OPTIONS.map((opt) => (
              <ChoiceButton
                key={opt.value}
                label={opt.label}
                selected={answers.pregnant === opt.value}
                onSelect={() => onChange({ pregnant: opt.value })}
              />
            ))}
          </div>

          <p className={`mt-4 ${FIELD_LABEL}`}>Are you currently trying to conceive?</p>
          <div className="mt-2 flex flex-col gap-2">
            {PREGNANCY_OPTIONS.map((opt) => (
              <ChoiceButton
                key={opt.value}
                label={opt.label}
                selected={answers.tryingToConceive === opt.value}
                onSelect={() => onChange({ tryingToConceive: opt.value })}
              />
            ))}
          </div>
        </>
      )}

      {showHealthWarning && (
        <DialogShell>
          <DialogTitle>A quick note</DialogTitle>
          <DialogBody>
            Considering your health conditions, please start with light fasting only and check with your doctor.
          </DialogBody>
          <div className="mt-5">
            <PrimaryButton onClick={() => setShowHealthWarning(false)}>I understand</PrimaryButton>
          </div>
        </DialogShell>
      )}
    </>
  );
}

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: "weight_loss", label: "Weight loss" },
  { value: "hormonal_balance", label: "Hormonal balance" },
  { value: "cycle_awareness", label: "Cycle awareness" },
  { value: "spiritual_practice", label: "Spiritual practice" },
  { value: "general_wellness", label: "General wellness" },
  { value: "energy", label: "Energy" },
  { value: "other", label: "Other" },
];

export interface SafetyOverrideScreenProps {
  body: string;
  /** 1 button for a straightforward self-attestation (ED/binge); 2 for a softer nudge where
   *  "I haven't yet, but let me see my plan anyway" is also a reasonable answer (trying to
   *  conceive). The last one listed renders as the SecondaryButton (outline) style. */
  buttons: { label: string; onClick: () => void }[];
}

/** Shown in place of the wizard's normal screens when a soft safety gate triggers — unlike the
 *  pregnancy gate (a hard medical contraindication with no override), these are all cases where
 *  self-attesting lets someone continue past this screen. */
export function SafetyOverrideScreen({ body, buttons }: SafetyOverrideScreenProps) {
  return (
    <>
      <DialogTitle>Let&apos;s take care of this first</DialogTitle>
      <DialogBody>{body}</DialogBody>
      <div className="mt-5 flex flex-col gap-2">
        {buttons.map((b, i) =>
          i === buttons.length - 1 && buttons.length > 1 ? (
            <SecondaryButton key={b.label} onClick={b.onClick}>
              {b.label}
            </SecondaryButton>
          ) : (
            <PrimaryButton key={b.label} onClick={b.onClick}>
              {b.label}
            </PrimaryButton>
          ),
        )}
        <Link
          href="/"
          className="mt-1 w-full text-center font-accent text-xs text-silver hover:text-ivory hover:underline"
        >
          Back to home
        </Link>
      </div>
    </>
  );
}

export function GoalsScreen({ answers, onChange }: ScreenProps) {
  const goals = answers.goals ?? [];

  function toggle(goal: Goal) {
    onChange({ goals: goals.includes(goal) ? goals.filter((g) => g !== goal) : [...goals, goal] });
  }

  return (
    <>
      <DialogTitle>What brings you to AIRfasting?</DialogTitle>
      <DialogBody>Pick as many as apply — or skip this if you&apos;d rather not say.</DialogBody>
      <div className="mt-4 flex flex-col gap-2">
        {GOAL_OPTIONS.map((opt) => (
          <ChoiceButton key={opt.value} label={opt.label} selected={goals.includes(opt.value)} onSelect={() => toggle(opt.value)} />
        ))}
      </div>
    </>
  );
}
