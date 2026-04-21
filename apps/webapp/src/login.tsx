import { supabase } from "@/libs/supabase.js";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

export default function Login() {
	return (
		<main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-8 text-slate-900">
			<div className="w-full max-w-sm">
				<Auth
					view="sign_in"
					providers={[]}
					showLinks={false}
					supabaseClient={supabase}
					appearance={{
						theme: ThemeSupa,
						style: {
							container: {
								width: "100%",
							},
							label: {
								color: "#334155",
								fontSize: "0.875rem",
								fontWeight: "500",
								marginBottom: "0.375rem",
							},
							input: {
								width: "100%",
								borderColor: "#cbd5e1",
								borderRadius: "0.5rem",
								color: "#0f172a",
								fontSize: "1rem",
								minHeight: "2.75rem",
								padding: "0.625rem 0.75rem",
							},
							button: {
								width: "100%",
								borderRadius: "0.5rem",
								background: "#1e293b",
								borderColor: "#1e293b",
								color: "#ffffff",
								fontSize: "0.95rem",
								fontWeight: "600",
								minHeight: "2.75rem",
								marginTop: "0.5rem",
							},
							message: {
								fontSize: "0.875rem",
							},
						},
						className: {
							button: "hover:!bg-slate-700 focus:!ring-2 focus:!ring-slate-400",
							input:
								"focus:!border-slate-700 focus:!ring-2 focus:!ring-slate-300",
						},
					}}
				/>
			</div>
		</main>
	);
}
