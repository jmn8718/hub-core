import { Providers } from "@repo/types";
import { ArrowLeft, Loader2, SearchCheck } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bounce, toast } from "react-toastify";
import { Box } from "../components/Box.js";
import { H2 } from "../components/H2.js";
import { SectionContainer } from "../components/SectionContainer.js";
import { Routes } from "../constants.js";
import { useDataClient, useLoading } from "../contexts/index.js";

const providerValues = new Set<string>(Object.values(Providers));

function isProvider(value: string | undefined): value is Providers {
	return Boolean(value && providerValues.has(value));
}

export function ProviderActivitySyncPage() {
	const { provider: providerParam } = useParams();
	const navigate = useNavigate();
	const { client } = useDataClient();
	const { setLocalLoading } = useLoading();
	const [activityId, setActivityId] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const provider = useMemo(
		() => (isProvider(providerParam) ? providerParam : undefined),
		[providerParam],
	);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!provider) return;

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

	if (!provider) {
		return (
			<Box>
				<SectionContainer>
					<H2 text="Unknown Provider" classes="font-bold" />
					<p className="mt-2 text-sm text-gray-600">
						The selected provider is not supported for activity sync.
					</p>
					<Link
						to={Routes.PROVIDERS}
						className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
					>
						<ArrowLeft size={16} />
						Back to providers
					</Link>
				</SectionContainer>
			</Box>
		);
	}

	return (
		<Box>
			<SectionContainer>
				<Link
					to={Routes.PROVIDERS}
					className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
				>
					<ArrowLeft size={16} />
					Back to providers
				</Link>
				<div className="mb-6">
					<H2
						text={`${provider} Activity Sync`}
						classes="font-bold uppercase"
					/>
					<p className="mt-2 text-sm text-gray-600">
						Enter the provider activity ID. The app will fetch that activity
						from {provider}, import it, and link the provider record locally.
					</p>
				</div>
				<form onSubmit={handleSubmit} className="max-w-xl space-y-4">
					<label className="block">
						<span className="mb-2 block text-sm font-medium text-gray-700">
							Activity ID
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
			</SectionContainer>
		</Box>
	);
}
