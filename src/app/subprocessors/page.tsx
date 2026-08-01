import { LegalDocument } from "@/components/legal/LegalDocument";
import { SUBPROCESSOR_REGISTER } from "@/lib/legal/subprocessors";

export default function SubprocessorsPage() {
  return <LegalDocument doc={SUBPROCESSOR_REGISTER} />;
}
