import { LegalDocument } from "@/components/legal/LegalDocument";
import { SECURITY_OVERVIEW } from "@/lib/legal/security";

export default function SecurityOverviewPage() {
  return <LegalDocument doc={SECURITY_OVERVIEW} />;
}
