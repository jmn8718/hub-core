import { useState, useEffect } from "react";

import { App } from "@repo/app";
import { supabase } from "./libs/supabase";
import { WebClient } from "./libs/client";
import { AppType } from "@repo/types";
import { Session } from "@supabase/supabase-js";
import Login from "./login";

const client = new WebClient();

export default function WebApp() {
  const [userSession, setUserSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("get session", session);
      setUserSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("auth state", session);
      setUserSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  console.log("user", userSession);
  return userSession ? <App client={client} type={AppType.WEB} /> : <Login />;
}
