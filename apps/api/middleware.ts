import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
	if (!req.nextUrl.pathname.startsWith("/api")) {
		const url = req.nextUrl.clone();
		url.pathname = "/";
		return NextResponse.redirect(url);
	}

	const res = NextResponse.next();
	const supabase = createMiddlewareClient({ req, res });
	const {
		data: { session },
		error,
	} = await supabase.auth.getSession();

	if (error) {
		console.error(error);
		return NextResponse.json(
			{ message: error.message, code: "internal error" },
			{
				status: 500,
			},
		);
	}
	if (!session) {
		// no user, potentially respond by redirecting the user to the login page
		const url = req.nextUrl.clone();
		url.pathname = "/login";
		return NextResponse.json(
			{ message: "unauthorized" },
			{
				status: 401,
			},
		);
	}
	return res;
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * Feel free to modify this pattern to include more paths.
		 */
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
