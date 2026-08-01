import { LegalDocument } from "@/components/legal/LegalDocument";
import { TERMS_OF_SERVICE } from "@/lib/legal/terms";

export default function TermsPage() {
  return <LegalDocument doc={TERMS_OF_SERVICE} />;
}
