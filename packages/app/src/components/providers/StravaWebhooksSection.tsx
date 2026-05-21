import {
	AppType,
	type ICloudSyncStatus,
	type StravaPushSubscription,
} from "@repo/types";
import { cn } from "@repo/ui";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDataClient, useLoading, useTheme } from "../../contexts/index.js";
import { Box } from "../Box.js";
import { Button } from "../Button.js";
import { SectionContainer } from "../SectionContainer.js";
import { Text } from "../Text.js";

const stravaSkeletonIds = ["one", "two", "three"] as const;

export function StravaWebhooksSection() {
	const { client, type } = useDataClient();
	const { setLocalLoading } = useLoading();
	const { isDarkMode } = useTheme();
	const [subscriptions, setSubscriptions] = useState<StravaPushSubscription[]>(
		[],
	);
	const [callbackUrl, setCallbackUrl] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [cloudStatus, setCloudStatus] = useState<ICloudSyncStatus | null>(null);
	const [isCloudStatusLoading, setIsCloudStatusLoading] = useState(
		type === AppType.DESKTOP,
	);

	const isDesktop = type === AppType.DESKTOP;
	const canManageSubscriptions =
		!isDesktop || Boolean(cloudStatus?.configured && cloudStatus.authenticated);
	const hasActiveSubscription = subscriptions.length > 0;
	const skeletonClassName = cn(
		"animate-pulse rounded-lg",
		isDarkMode ? "bg-gray-700/70" : "bg-gray-200",
	);

	const loadCloudStatus = useCallback(async () => {
		if (!isDesktop) {
			setCloudStatus(null);
			setIsCloudStatusLoading(false);
			return true;
		}

		setLocalLoading(true);
		setIsCloudStatusLoading(true);
		try {
			const result = await client.getCloudSyncStatus();
			if (!result.success) {
				setError(result.error);
				return false;
			}

			setCloudStatus(result.data);

			if (!result.data.configured) {
				setError("Cloud sync is not configured in this desktop build");
				return false;
			}

			if (!result.data.authenticated) {
				setError("No cloud session is available for Strava subscriptions");
				return false;
			}

			return true;
		} finally {
			setIsCloudStatusLoading(false);
			setLocalLoading(false);
		}
	}, [client, isDesktop, setLocalLoading]);

	const loadSubscriptions = useCallback(async () => {
		setIsLoading(true);
		setIsRefreshing(true);
		const canLoad = await loadCloudStatus();
		if (!canLoad) {
			setSubscriptions([]);
			setIsLoading(false);
			setIsRefreshing(false);
			return;
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
	}, [client, loadCloudStatus]);

	useEffect(() => {
		void loadSubscriptions();
	}, [loadSubscriptions]);

	const handleCreateSubscription = async () => {
		const trimmedCallbackUrl = callbackUrl.trim();
		if (!trimmedCallbackUrl) {
			setError("Enter a callback URL before creating a subscription.");
			return;
		}

		if (!(await loadCloudStatus())) {
			return;
		}

		setIsSubmitting(true);
		setError(null);
		const result = await client.createStravaSubscription(trimmedCallbackUrl);
		if (result.success) {
			setCallbackUrl("");
			await loadSubscriptions();
		} else {
			setError(result.error);
		}
		setIsSubmitting(false);
	};

	const handleDeleteSubscription = async (id: number) => {
		if (!(await loadCloudStatus())) {
			return;
		}

		setIsSubmitting(true);
		setError(null);
		const result = await client.deleteStravaSubscription(id);
		if (result.success) {
			await loadSubscriptions();
		} else {
			setError(result.error);
		}
		setIsSubmitting(false);
	};

	return (
		<Box
			title="Webhooks"
			description="Manage the callback endpoints Strava uses to deliver webhook events to this app."
			classes="overflow-hidden"
		>
			<SectionContainer hasBorder>
				<div className="flex flex-col gap-3 lg:flex-row-reverse">
					<Button
						variant="ghost"
						onClick={() => loadSubscriptions()}
						disabled={
							isLoading ||
							isSubmitting ||
							isRefreshing ||
							isCloudStatusLoading ||
							!canManageSubscriptions
						}
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

			{error ? (
				<SectionContainer>
					<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/70 dark:bg-red-950/40">
						<Text text={error} />
					</div>
				</SectionContainer>
			) : null}

			{isLoading ? (
				<>
					<SectionContainer hasBorder>
						<div className="space-y-3">
							<div className={cn(skeletonClassName, "h-8 w-56")} />
							<div className={cn(skeletonClassName, "h-11 w-full")} />
							<div className={cn(skeletonClassName, "h-4 w-full max-w-2xl")} />
							<div className={cn(skeletonClassName, "h-11 w-56")} />
						</div>
					</SectionContainer>

					<SectionContainer>
						<div className="space-y-3">
							{stravaSkeletonIds.map((id) => (
								<div
									key={id}
									className="rounded-lg border border-slate-200 px-4 py-4 dark:border-slate-800"
								>
									<div className="space-y-3">
										<div className={cn(skeletonClassName, "h-5 w-full")} />
										<div className={cn(skeletonClassName, "h-4 w-32")} />
									</div>
								</div>
							))}
						</div>
					</SectionContainer>
				</>
			) : hasActiveSubscription ? (
				<SectionContainer title="Active Subscriptions">
					<div className="space-y-3">
						{subscriptions.map((subscription) => (
							<div
								key={subscription.id}
								className="flex flex-col gap-3 rounded-lg border border-slate-200 px-4 py-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between"
							>
								<div className="min-w-0 space-y-1">
									<Text text={subscription.callbackUrl} className="break-all" />
									<Text
										variant="description"
										text={`Subscription ID ${subscription.id}`}
									/>
								</div>
								<Button
									variant="danger"
									onClick={() => handleDeleteSubscription(subscription.id)}
									disabled={
										isSubmitting ||
										isCloudStatusLoading ||
										!canManageSubscriptions
									}
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
				</SectionContainer>
			) : (
				<SectionContainer title="Create Subscription">
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
							className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
						/>
						<Text
							variant="description"
							text="Use the public API webhook endpoint that Strava should call for activity create and update events."
						/>
						{isDesktop && !canManageSubscriptions ? (
							<div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
								{isCloudStatusLoading
									? "Checking cloud session..."
									: cloudStatus?.configured
										? "Cloud sync requires an existing cloud session before managing Strava subscriptions."
										: "Cloud sync must be configured in this desktop build before managing Strava subscriptions."}
							</div>
						) : null}
						<Button
							onClick={handleCreateSubscription}
							disabled={
								isSubmitting ||
								isCloudStatusLoading ||
								!canManageSubscriptions ||
								!callbackUrl.trim()
							}
							className="rounded-lg"
						>
							<span className="inline-flex items-center gap-2">
								<Plus size={16} />
								Create Subscription
							</span>
						</Button>
					</div>
				</SectionContainer>
			)}
		</Box>
	);
}
