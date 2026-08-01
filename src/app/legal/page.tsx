import { LegalDocument } from "@/components/legal/LegalDocument";
import { PLAIN_LANGUAGE_SUMMARY } from "@/lib/legal/summary";

export default function LegalSummaryPage() {
  return <LegalDocument doc={PLAIN_LANGUAGE_SUMMARY} />;
}
