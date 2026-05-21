import type { Providers } from "@repo/types";
import { Loader2, SearchCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bounce, toast } from "react-toastify";
import { Routes } from "../../constants.js";
import { useDataClient, useLoading } from "../../contexts/index.js";
import { Box } from "../Box.js";

export function ProviderActivitySyncSection({
	provider,
}: {
	provider: Providers;
}) {
	const navigate = useNavigate();
	const { client } = useDataClient();
	const { setLocalLoading } = useLoading();
	const [activityId, setActivityId] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const trimmedActivityId = activityId.trim();
		if (!trimmedActivityId) {
			toast.error("Enter a provider activity ID.", {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
			return;
		}

		setIsSubmitting(true);
		setLocalLoading(true);

		try {
			const result = await client.providerSyncActivity(
				provider,
				trimmedActivityId,
			);
			if (!result.success) {
				throw new Error(result.error);
			}

			toast.success(`${provider} activity synced.`, {
				transition: Bounce,
			});
			navigate(`${Routes.DETAILS}/${result.id}`);
		} catch (error) {
			toast.error((error as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		} finally {
			setTimeout(() => {
				setIsSubmitting(false);
				setLocalLoading(false);
			}, 200);
		}
	};

	return (
		<Box
			title="Activity Sync Session"
			description={`Fetch a single activity from ${provider} by provider activity ID.`}
		>
			<form onSubmit={handleSubmit} className="max-w-xl space-y-4">
				<label className="block">
					<span className="mb-2 block text-sm font-medium text-gray-700">
						Activity
					</span>
					<input
						type="text"
						value={activityId}
						onChange={(event) => setActivityId(event.target.value)}
						placeholder="Provider activity ID"
						disabled={isSubmitting}
						className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
					/>
				</label>
				<button
					type="submit"
					disabled={isSubmitting}
					className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{isSubmitting ? (
						<Loader2 size={18} className="animate-spin" />
					) : (
						<SearchCheck size={18} />
					)}
					{isSubmitting ? "Syncing activity..." : "Sync activity"}
				</button>
			</form>
		</Box>
	);
}
