import strava, { updateToken } from "@/lib/strava";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");
	let status = "error";
	let message = "";
	try {
		if (code) {
			const token = await strava.oauth.getToken(code);
			updateToken(token.access_token);
			status = "success";
		} else {
			message = "missing_code";
		}
	} catch (err) {
		message = (err as Error).message;
	}
	return NextResponse.redirect(
		new URL(`/account?status=${status}&message=${message}`, request.url),
	);
}
