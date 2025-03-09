import { Header } from "@/components/header";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const supabase = createServerComponentClient({ cookies });
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		return redirect("/");
	}

	return (
		<div className="min-h-screen">
			<Header />
			<div className="container mx-auto p-4">{children}</div>
		</div>
	);
}
