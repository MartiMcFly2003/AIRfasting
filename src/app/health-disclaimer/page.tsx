import { LegalDocument } from "@/components/legal/LegalDocument";
import { HEALTH_DISCLAIMER } from "@/lib/legal/health";

export default function HealthDisclaimerPage() {
  return <LegalDocument doc={HEALTH_DISCLAIMER} />;
}
