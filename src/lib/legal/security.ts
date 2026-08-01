import type { LegalDoc } from "./types";

export const SECURITY_OVERVIEW: LegalDoc = {
  "title": "AIRfasting Security & Privacy Overview",
  "version": "Version: Draft v1.0",
  "lastUpdated": "Last updated: 29 July 2026",
  "blocks": [
    {
      "type": "h1",
      "text": "1. Purpose"
    },
    {
      "type": "p",
      "text": "This document provides a plain-language overview of how AIRfasting protects your data. It is intended to build trust and transparency and complements the more detailed legal terms in our Privacy Policy."
    },
    {
      "type": "h1",
      "text": "2. Our Security Principles"
    },
    {
      "type": "p",
      "text": "AIRfasting is built on the principles of Privacy by Design and Security by Design: we consider data protection and security at every stage of building and operating our platform, not as an afterthought."
    },
    {
      "type": "h1",
      "text": "3. Technical Safeguards"
    },
    {
      "type": "ul",
      "items": [
        "Encryption in transit: All data transmitted between your device and AIRfasting is encrypted using industry-standard protocols (TLS).",
        "Encryption at rest: Personal data, including health data, is encrypted at rest within our infrastructure and that of our subprocessors (e.g., Supabase).",
        "Access controls: Access to production systems and personal data is restricted to authorized personnel on a need-to-know basis, using role-based access controls and multi-factor authentication.",
        "Authentication security: User authentication is handled via Supabase, using secure, industry-standard authentication practices.",
        "Payment security: Payment processing is handled entirely by Stripe, a PCI-DSS compliant payment processor. AIRfasting does not store full card details on its own systems.",
        "Monitoring and logging: We maintain logging and monitoring to detect and respond to potential security incidents."
      ]
    },
    {
      "type": "h1",
      "text": "4. Organizational Safeguards"
    },
    {
      "type": "ul",
      "items": [
        "Vendor due diligence: Before engaging any subprocessor that touches personal data, we assess their security and privacy practices and put data processing agreements in place. See our Subprocessor Register.",
        "Data minimization: We collect only the personal data necessary to provide AIRfasting's services.",
        "Staff access: Employees and contractors with access to personal data are bound by confidentiality obligations and receive privacy/security guidance appropriate to their role.",
        "Incident response: We maintain a process to detect, assess, and respond to data security incidents, including notifying affected users and the relevant supervisory authority (Agencia Española de Protección de Datos) without undue delay, and within 72 hours where required by GDPR, in the case of a qualifying personal data breach."
      ]
    },
    {
      "type": "h1",
      "text": "5. Special Protections for Health Data"
    },
    {
      "type": "p",
      "text": "Because AIRfasting processes special category health data under Article 9 GDPR, we apply heightened safeguards, including:"
    },
    {
      "type": "ul",
      "items": [
        "explicit, granular consent before processing health data;",
        "restricting health data processing strictly to the purposes you've consented to;",
        "not using health data for advertising or sharing it with data brokers;",
        "not selling health data under any circumstances."
      ]
    },
    {
      "type": "h1",
      "text": "6. Your Role in Security"
    },
    {
      "type": "p",
      "text": "You can help keep your account secure by:"
    },
    {
      "type": "ul",
      "items": [
        "using a strong, unique password;",
        "keeping your login credentials confidential;",
        "notifying us promptly if you suspect unauthorized access to your account;",
        "keeping your device and browser up to date."
      ]
    },
    {
      "type": "h1",
      "text": "7. International Data Transfers"
    },
    {
      "type": "p",
      "text": "Where our subprocessors operate outside the EEA, we ensure appropriate safeguards are in place (such as the European Commission's Standard Contractual Clauses or adequacy decisions), as detailed in our Subprocessor Register."
    },
    {
      "type": "h1",
      "text": "8. Continuous Improvement"
    },
    {
      "type": "p",
      "text": "We review our security practices periodically as AIRfasting grows, including as we add mobile applications and wearable integrations, to ensure protections scale with our platform."
    },
    {
      "type": "h1",
      "text": "9. Contact Us"
    },
    {
      "type": "p",
      "text": "To report a security concern or ask questions about our security practices, contact support@airfasting.com."
    },
    {
      "type": "note",
      "text": "This document forms part of AIRfasting's Legal Framework and should be read together with the Privacy Policy."
    }
  ]
};
