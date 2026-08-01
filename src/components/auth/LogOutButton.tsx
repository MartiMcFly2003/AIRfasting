"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/supabase/auth";

export function LogOutButton() {
  const router = useRouter();

  async function handleClick() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="font-accent text-xs text-silver hover:text-ivory hover:underline"
    >
      Log out
    </button>
  );
}
