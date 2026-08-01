import type { LegalDoc } from "./types";

export const SUBPROCESSOR_REGISTER: LegalDoc = {
  "title": "AIRfasting Subprocessor Register",
  "version": "Version: Draft v1.0",
  "lastUpdated": "Last updated: 29 July 2026",
  "blocks": [
    {
      "type": "h1",
      "text": "1. Purpose"
    },
    {
      "type": "p",
      "text": "This register lists the third-party subprocessors that Jovere Collective S.L. engages to process personal data on behalf of AIRfasting, in accordance with our transparency obligations under GDPR Article 28. We will update this register as our technology stack evolves and will notify users in advance of any new subprocessor that will process health data."
    },
    {
      "type": "h1",
      "text": "2. Current Subprocessors"
    },
    {
      "type": "table",
      "headers": [
        "Provider",
        "Purpose",
        "Data Shared",
        "Region / Safeguards"
      ],
      "rows": [
        [
          "Supabase",
          "Authentication and database hosting",
          "Account credentials, health & wellness data, fasting records",
          "Frankfurt, Germany (EU) — AWS eu-central-1. Hosted within the EU/EEA, so no international transfer safeguard is required for this subprocessor."
        ],
        [
          "Stripe",
          "Payment processing and subscription billing",
          "Billing/payment data (card details processed directly by Stripe; AIRfasting does not store full card numbers)",
          "Ireland (EU) — Stripe Payments Europe Limited, with underlying global processing infrastructure. Safeguarded via Stripe's Standard Contractual Clauses where applicable."
        ],
        [
          "Resend",
          "Transactional email delivery (e.g., reminders, account notifications)",
          "Name, email address, content of transactional emails",
          "[Insert region]. Safeguarded via Standard Contractual Clauses where applicable."
        ],
        [
          "PostHog",
          "Product analytics",
          "Usage/behavioral data, device/technical data (pseudonymized where possible)",
          "Frankfurt, Germany (EU) — PostHog Cloud EU. Hosted within the EU/EEA, so no international transfer safeguard is required for this subprocessor."
        ]
      ]
    },
    {
      "type": "note",
      "text": "Resend's hosting region is still being confirmed with their current Data Processing Agreement — this register will be updated once confirmed."
    },
    {
      "type": "h1",
      "text": "3. Strategic Wellness Partner"
    },
    {
      "type": "p",
      "text": "Our strategic wellness partner, based in Malaysia, contributes fasting methodologies, educational content, and scientific expertise, but does not currently process identifiable user personal data. This partner is not currently a subprocessor. If this changes, we will:"
    },
    {
      "type": "ul",
      "items": [
        "update this register before any such processing begins;",
        "execute an appropriate data processing agreement;",
        "implement international transfer safeguards required for transfers outside the EEA;",
        "update our Privacy Policy and notify users, seeking fresh consent where legally required."
      ]
    },
    {
      "type": "h1",
      "text": "4. Future Subprocessors"
    },
    {
      "type": "p",
      "text": "As AIRfasting expands (e.g., native mobile applications, wearable integrations, practitioner dashboards), we may engage additional subprocessors. We will:"
    },
    {
      "type": "ul",
      "items": [
        "update this register in advance of any new subprocessor beginning to process personal data;",
        "provide notice to users, particularly where health data is involved;",
        "ensure appropriate data processing agreements and transfer safeguards are in place before onboarding any new subprocessor."
      ]
    },
    {
      "type": "h1",
      "text": "5. How to Object"
    },
    {
      "type": "p",
      "text": "If you have concerns about a current or proposed subprocessor, you may contact us at support@airfasting.com. Where you have a right to object under applicable law, we will consider your objection in accordance with GDPR."
    },
    {
      "type": "note",
      "text": "This document forms part of AIRfasting's Legal Framework and should be read together with the Privacy Policy and Security & Privacy Overview."
    }
  ]
};
