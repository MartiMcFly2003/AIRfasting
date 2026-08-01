import { LegalDocument } from "@/components/legal/LegalDocument";
import { PRIVACY_POLICY } from "@/lib/legal/privacy";

export default function PrivacyPage() {
  return <LegalDocument doc={PRIVACY_POLICY} />;
}
