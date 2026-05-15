import type { StravaPushSubscription } from "@repo/types";
import { AlertCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Box } from "../components/Box.js";
import { Button } from "../components/Button.js";
import { H2 } from "../components/H2.js";
import { SectionContainer } from "../components/SectionContainer.js";
import { Text } from "../components/Text.js";
import { useDataClient } from "../contexts/index.js";

export function StravaPage() {
	const { client } = useDataClient();
	const [subscriptions, setSubscriptions] = useState<StravaPushSubscription[]>(
		[],
	);
	const [callbackUrl, setCallbackUrl] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const loadSubscriptions = useCallback(
		async ({ silent = false } = {}) => {
			if (silent) {
				setIsRefreshing(true);
			} else {
				setIsLoading(true);
			}
			setError(null);

			const result = await client.getStravaSubscriptions();
			if (result.success) {
				setSubscriptions(result.data);
			} else {
				setError(result.error);
			}

			setIsLoading(false);
			setIsRefreshing(false);
		},
		[client],
	);

	useEffect(() => {
		loadSubscriptions();
	}, [loadSubscriptions]);

	const handleCreateSubscription = async () => {
		const trimmedCallbackUrl = callbackUrl.trim();
		if (!trimmedCallbackUrl) {
			setError("Enter a callback URL before creating a subscription.");
			return;
		}

		setIsSubmitting(true);
		setError(null);
		const result = await client.createStravaSubscription(trimmedCallbackUrl);
		if (result.success) {
			setCallbackUrl("");
			await loadSubscriptions({ silent: true });
		} else {
			setError(result.error);
		}
		setIsSubmitting(false);
	};

	const handleDeleteSubscription = async (id: number) => {
		setIsSubmitting(true);
		setError(null);
		const result = await client.deleteStravaSubscription(id);
		if (result.success) {
			await loadSubscriptions({ silent: true });
		} else {
			setError(result.error);
		}
		setIsSubmitting(false);
	};

	return (
		<div className="space-y-4">
			<Box
				title="Strava Push Subscriptions"
				description="Manage the callback endpoints Strava uses to deliver webhook events to this app."
				classes="overflow-hidden"
			>
				<SectionContainer hasBorder>
					<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
						<div className="space-y-2">
							<H2 text="Webhook Endpoints" classes="text-xl" />
							<Text
								variant="description"
								text="Create or remove Strava push subscriptions without leaving the app. This uses the same Strava subscription flow as admin."
							/>
						</div>
						<Button
							variant="ghost"
							onClick={() => loadSubscriptions({ silent: true })}
							disabled={isLoading || isSubmitting || isRefreshing}
							className="rounded-lg"
						>
							<span className="inline-flex items-center gap-2">
								<RefreshCw
									size={16}
									className={isRefreshing ? "animate-spin" : undefined}
								/>
								Refresh
							</span>
						</Button>
					</div>
				</SectionContainer>

				<SectionContainer hasBorder title="Create Subscription">
					<div className="space-y-3">
						<label
							htmlFor="strava-callback-url"
							className="block text-sm font-medium text-current"
						>
							Callback URL
						</label>
						<input
							id="strava-callback-url"
							type="url"
							value={callbackUrl}
							onChange={(event) => setCallbackUrl(event.target.value)}
							placeholder="https://your-api.vercel.app/api/webhook/strava"
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-900"
						/>
						<Text
							variant="description"
							text="Use the public API webhook endpoint that Strava should call for activity create and update events."
						/>
						<Button
							onClick={handleCreateSubscription}
							disabled={isSubmitting || !callbackUrl.trim()}
							className="rounded-lg"
						>
							<span className="inline-flex items-center gap-2">
								<Plus size={16} />
								Create Subscription
							</span>
						</Button>
					</div>
				</SectionContainer>

				<SectionContainer title="Active Subscriptions">
					{error ? (
						<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/70 dark:bg-red-950/40">
							<Text text={error} />
						</div>
					) : null}

					{isLoading ? (
						<div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 dark:border-slate-700">
							<Text
								variant="description"
								text="Loading Strava subscriptions..."
							/>
						</div>
					) : subscriptions.length === 0 ? (
						<div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 dark:border-slate-700">
							<div className="flex items-start gap-3">
								<AlertCircle size={18} className="mt-0.5 shrink-0" />
								<div className="space-y-1">
									<Text text="No active Strava subscriptions." />
									<Text
										variant="description"
										text="Create one above to start receiving Strava webhook events on your selected endpoint."
									/>
								</div>
							</div>
						</div>
					) : (
						<div className="space-y-3">
							{subscriptions.map((subscription) => (
								<div
									key={subscription.id}
									className="flex flex-col gap-3 rounded-lg border border-slate-200 px-4 py-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between"
								>
									<div className="min-w-0 space-y-1">
										<Text
											text={subscription.callbackUrl}
											className="break-all"
										/>
										<Text
											variant="description"
											text={`Subscription ID ${subscription.id}`}
										/>
									</div>
									<Button
										variant="danger"
										onClick={() => handleDeleteSubscription(subscription.id)}
										disabled={isSubmitting}
										className="rounded-lg"
									>
										<span className="inline-flex items-center gap-2">
											<Trash2 size={16} />
											Delete
										</span>
									</Button>
								</div>
							))}
						</div>
					)}
				</SectionContainer>
			</Box>
		</div>
	);
}
