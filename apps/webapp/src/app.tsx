import { useState, useEffect } from "react";

import { App } from "@repo/app";
import { AppType } from "@repo/types";
import { WebClient, SupabaseUserSession } from "@repo/clients";
import { supabase } from "@/libs/supabase.js";
import Login from "@/login.js";

const client = new WebClient(supabase);

export default function WebApp() {
  const [userSession, setUserSession] = useState<SupabaseUserSession | null>(
    null,
  );
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return userSession ? <App client={client} type={AppType.WEB} /> : <Login />;
}
