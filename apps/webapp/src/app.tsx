import { useState, useEffect } from "react";

import { App } from "@repo/app";
import { AppType } from "@repo/types";
import { Session } from "@supabase/supabase-js";
import { WebClient } from "@/libs/client.js";
import { supabase } from "@/libs/supabase.js";
import Login from "@/login.js";

const client = new WebClient();

export default function WebApp() {
  const [userSession, setUserSession] = useState<Session | null>(null);
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
