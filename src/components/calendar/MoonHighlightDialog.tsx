"use client";

import type { ISODate, MoonHighlightType } from "@/lib/calendar";
import { CancelLink, DialogBody, DialogShell, DialogTitle } from "./DialogPrimitives";

// Editable content, same spirit as the brief's other contextual copy (prep/refeed guidance,
// fasting-duration education) — eventually this would live in Supabase's `content` table so
// it can be updated without a deploy, same as those.
const MOON_HIGHLIGHT_INFO: Record<MoonHighlightType, { title: string; body: string }> = {
  new_moon: {
    title: "New Moon",
    body: "The lunar cycle is beginning again. Some find this a quiet, supportive day to fast if you're already in a fasting-possible phase — others simply notice it and move on. It's shown here as information, not a nudge either way.",
  },
  full_moon: {
    title: "Full Moon",
    body: "The moon is at its fullest. Traditionally associated with culmination and release, but like every moon highlight on this calendar, it's context only — it never changes whether today is a rest day or a fasting-possible one.",
  },
  ekadashi: {
    title: "Ekadashi",
    body: "The 11th day of the lunar fortnight, observed with fasting in some spiritual traditions. AIRfasting shows it so you have the option to align with it if it's meaningful to you — there's no expectation, and it doesn't override your own rhythm.",
  },
};

// One-off override for the rare solar eclipse coinciding with this particular new moon — every
// other new moon keeps the evergreen copy above.
const DATE_OVERRIDES: Partial<Record<ISODate, { title: string; body: string }>> = {
  "2026-08-12": {
    title: "New Moon — with a Rare Solar Eclipse",
    body: "Today's new moon lines up with a total solar eclipse, the sun and moon so closely aligned that the sky itself dims for a few minutes. It's a rare thing to witness. If you're already in a fasting-possible phase, some find it fitting to keep things especially light on a day when the sun does too — shown here as information, not a nudge either way.",
  },
};

export interface MoonHighlightDialogProps {
  date: ISODate;
  type: MoonHighlightType;
  onClose: () => void;
}

export function MoonHighlightDialog({ date, type, onClose }: MoonHighlightDialogProps) {
  const { title, body } = DATE_OVERRIDES[date] ?? MOON_HIGHLIGHT_INFO[type];
  const dateLabel = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <DialogShell>
      <p className="font-accent text-xs uppercase tracking-wider text-gold">{dateLabel}</p>
      <div className="mt-1">
        <DialogTitle>{title}</DialogTitle>
      </div>
      <DialogBody>{body}</DialogBody>
      <CancelLink onClick={onClose}>Close</CancelLink>
    </DialogShell>
  );
}
