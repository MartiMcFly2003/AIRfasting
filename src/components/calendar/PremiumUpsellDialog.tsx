"use client";

import { useRouter } from "next/navigation";
import { CancelLink, DialogBody, DialogShell, DialogTitle, PrimaryButton } from "./DialogPrimitives";

export interface PremiumUpsellDialogProps {
  message: string;
  onClose: () => void;
}

export function PremiumUpsellDialog({ message, onClose }: PremiumUpsellDialogProps) {
  const router = useRouter();
  return (
    <DialogShell>
      <DialogTitle>Premium feature</DialogTitle>
      <DialogBody>{message}</DialogBody>
      <div className="mt-5 flex flex-col gap-2">
        <PrimaryButton onClick={() => router.push("/start-trial")}>Upgrade to Premium</PrimaryButton>
        <CancelLink onClick={onClose}>Got it</CancelLink>
      </div>
    </DialogShell>
  );
}
