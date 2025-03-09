"use client";

import { Button } from "@repo/ui";
import { BookX } from "lucide-react";

const API_PATH = "/api/logs";
export function DeleteRow({ id }: { id: number }) {
	const deleteLog = async (logId: number) => {
		const response = await fetch(API_PATH, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ id: logId }),
		});
		const data = await response.json();
		console.log("Log deleted:", data);
		window.location.reload();
	};

	return (
		<Button variant="ghost" onClick={() => deleteLog(id)}>
			<BookX />
		</Button>
	);
}
