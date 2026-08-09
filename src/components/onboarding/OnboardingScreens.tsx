"use client";

import Link from "next/link";
import { useState } from "react";
import { DialogBody, DialogShell, DialogTitle, PrimaryButton } from "@/components/calendar/DialogPrimitives";
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

export function ConsentScreen({ answers, onChange }: ScreenProps) {
  return (
    <>
      <DialogTitle>Before we start</DialogTitle>
      <DialogBody>Two things we need your explicit agreement on.</DialogBody>
      <div className="mt-4 flex flex-col gap-4">
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
        <div>
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
        </div>
      </div>
    </>
  );
}

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

const PREGNANCY_OPTIONS: { value: NonNullable<OnboardingAnswers["pregnancyOrTryingToConceive"]>; label: string }[] = [
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
          <p className={`mt-4 ${FIELD_LABEL}`}>Are you currently pregnant, or trying to conceive?</p>
          <div className="mt-2 flex flex-col gap-2">
            {PREGNANCY_OPTIONS.map((opt) => (
              <ChoiceButton
                key={opt.value}
                label={opt.label}
                selected={answers.pregnancyOrTryingToConceive === opt.value}
                onSelect={() => onChange({ pregnancyOrTryingToConceive: opt.value })}
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

export interface CoachGateScreenProps {
  onConfirmCoachSupport: () => void;
}

/** Shown in place of the wizard's normal screens when the safety gate (ED/binge answers)
 *  triggers — unlike the pregnancy gate (a hard medical contraindication with no override),
 *  someone already working with a coach can self-attest and continue past this screen. */
export function CoachGateScreen({ onConfirmCoachSupport }: CoachGateScreenProps) {
  return (
    <>
      <DialogTitle>Let&apos;s take care of this first</DialogTitle>
      <DialogBody>
        Thank you for being honest with us. Based on what you shared, we&apos;d rather start with
        a real conversation than a calendar. AIRfasting works best alongside proper support when
        food and fasting have felt complicated before. We advise you to get in touch with a
        fasting or nutritional coach first, to get support and additional direction during your
        individual journey.
      </DialogBody>
      <div className="mt-5 flex flex-col gap-2">
        <PrimaryButton onClick={onConfirmCoachSupport}>
          I&apos;m currently receiving and/or recently received coach support to help guide my
          fasting
        </PrimaryButton>
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
