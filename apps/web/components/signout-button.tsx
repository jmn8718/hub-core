"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { Button } from "@repo/ui";
import { LogOut } from "lucide-react";

export function SignOut() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleSignOut}
      title="Sign out"
    >
      <LogOut className="h-5 w-5" />
    </Button>
  );
}
