import { supabase } from "@/libs/supabase.js";
import { Container } from "@repo/ui/container";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

export default function Login() {
	return (
		<Container>
			<Auth
				view="sign_in"
				providers={[]}
				showLinks={false}
				supabaseClient={supabase}
				appearance={{ theme: ThemeSupa }}
			/>
		</Container>
	);
}
