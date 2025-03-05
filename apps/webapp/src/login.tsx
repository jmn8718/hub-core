import { Auth } from "@supabase/auth-ui-react";
import { supabase } from "./libs/supabase";
import { ThemeSupa } from "@supabase/auth-ui-shared";

export default function Login() {
  return (
    <div className="h-full max-w-2xl mx-auto min-w-[480px]">
      <Auth
        view="sign_in"
        providers={[]}
        showLinks={false}
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
      />
    </div>
  );
}
