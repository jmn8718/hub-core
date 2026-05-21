import { requireUser } from "@/lib/auth";
import { getEnvProviderConfig, getProviderManager } from "@/lib/providers";
import { Providers } from "@repo/types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const isProvider = (value: string): value is Providers =>
	Object.values(Providers).includes(value as Providers);

export async function GET(req: NextRequest) {
	const authContext = await requireUser(req);
	if (!authContext) {
		return NextResponse.json(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	const providerValue = req.nextUrl.searchParams.get("provider");
	const providerActivityId =
		req.nextUrl.searchParams.get("providerActivityId") ?? "";

	if (!providerValue || !isProvider(providerValue)) {
		return NextResponse.json(
			{ success: false, error: "Invalid provider" },
			{ status: 400 },
		);
	}
	if (!providerActivityId) {
		return NextResponse.json(
			{ success: false, error: "Missing provider activity id" },
			{ status: 400 },
		);
	}
	if (!getEnvProviderConfig(providerValue)) {
		return NextResponse.json(
			{ success: false, error: "Provider is not configured on the server" },
			{ status: 400 },
		);
	}

	try {
		const manager = await getProviderManager();
		const { fileBytes, fileName, contentType } =
			await manager.downloadActivityFileAsBuffer({
				provider: providerValue,
				providerActivityId,
			});

		return new NextResponse(fileBytes as BodyInit, {
			status: 200,
			headers: {
				"Content-Type": contentType,
				"Content-Disposition": `attachment; filename="${fileName}"`,
				"Cache-Control": "no-store",
			},
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: (error as Error).message,
			},
			{ status: 500 },
		);
	}
}
