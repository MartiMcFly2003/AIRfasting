import { LegalDocument } from "@/components/legal/LegalDocument";
import { COOKIE_POLICY } from "@/lib/legal/cookies";

export default function CookiePolicyPage() {
  return <LegalDocument doc={COOKIE_POLICY} />;
}
