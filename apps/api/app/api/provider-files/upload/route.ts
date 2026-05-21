import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireUser } from "@/lib/auth";
import { getEnvProviderConfig, getProviderManager } from "@/lib/providers";
import { Providers } from "@repo/types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const isProvider = (value: string): value is Providers =>
	Object.values(Providers).includes(value as Providers);

const sanitizeFileName = (value: string) =>
	value.replace(/[^a-zA-Z0-9._-]/g, "_");

export async function POST(req: NextRequest) {
	const authContext = await requireUser(req);
	if (!authContext) {
		return NextResponse.json(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	try {
		const formData = await req.formData();
		const targetValue = formData.get("target");
		const file = formData.get("file");

		if (typeof targetValue !== "string" || !isProvider(targetValue)) {
			return NextResponse.json(
				{ success: false, error: "Invalid provider" },
				{ status: 400 },
			);
		}
		if (!(file instanceof File)) {
			return NextResponse.json(
				{ success: false, error: "Missing upload file" },
				{ status: 400 },
			);
		}
		if (!getEnvProviderConfig(targetValue)) {
			return NextResponse.json(
				{ success: false, error: "Provider is not configured on the server" },
				{ status: 400 },
			);
		}

		const tempDirectory = await mkdtemp(
			join(tmpdir(), "hub-core-provider-upload-"),
		);
		const filePath = join(
			tempDirectory,
			sanitizeFileName(file.name || "activity-upload.fit"),
		);

		try {
			await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
			const manager = await getProviderManager();
			await manager.uploadActivityFileFromPath({
				target: targetValue,
				filePath,
			});
		} finally {
			await rm(tempDirectory, { recursive: true, force: true });
		}

		return NextResponse.json({ success: true });
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
