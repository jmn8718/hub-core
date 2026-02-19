import { GearType, type IDbGearWithDistance, Providers } from "@repo/types";
import { cn } from "@repo/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Bounce, toast } from "react-toastify";
import { Box } from "../components/Box.js";
import { Text } from "../components/Text.js";
import { GearCard } from "../components/index.js";
import { useDataClient, useLoading, useTheme } from "../contexts/index.js";
import { generateExternalGearLink } from "../utils/providers.js";

const providersList = [Providers.GARMIN, Providers.COROS, Providers.STRAVA];

export function GearDetails() {
	const { client } = useDataClient();
	const { setLocalLoading } = useLoading();
	const { colors, isDarkMode } = useTheme();
	const { gearId } = useParams();
	const [gear, setGear] = useState<IDbGearWithDistance | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [pendingProvider, setPendingProvider] = useState<Providers | null>(
		null,
	);

	const loadGear = useCallback(async () => {
		if (!gearId) {
			toast.error("Missing gear id", { transition: Bounce });
			setIsLoading(false);
			return null;
		}
		setIsLoading(true);
		const result = await client.getGear(gearId);
		if (!result.success || !result.data) {
			const message = result.success ? "Gear not found" : result.error;
			toast.error(message, { transition: Bounce });
			setGear(null);
			setIsLoading(false);
			return null;
		}
		setGear(result.data);
		setIsLoading(false);
		return result.data;
	}, [client, gearId]);

	useEffect(() => {
		loadGear();
	}, [loadGear]);

	const connectionMap = useMemo(() => {
		if (!gear?.providerConnections) return new Map<Providers, string>();
		return new Map(
			gear.providerConnections.map((connection) => [
				connection.provider,
				connection.providerId,
			]),
		);
	}, [gear?.providerConnections]);

	const handleOpenProvider = async (
		provider: Providers,
		providerId: string,
	) => {
		try {
			await client.openLink(generateExternalGearLink(provider, providerId));
		} catch (error) {
			toast.error((error as Error).message, { transition: Bounce });
		}
	};

	const handleConnect = async (provider: Providers) => {
		if (!gear) return;
		setPendingProvider(provider);
		setLocalLoading(true);
		try {
			const result = await client.providerGearCreate(provider, gear.id);
			if (!result.success) {
				throw new Error(result.error);
			}
			await loadGear();
			toast.success(`${provider} gear connected`, { transition: Bounce });
		} catch (error) {
			toast.error((error as Error).message, { transition: Bounce });
		} finally {
			setPendingProvider(null);
			setTimeout(() => setLocalLoading(false), 200);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-10 text-gray-500 dark:text-gray-400">
				Loading gear…
			</div>
		);
	}

	if (!gear) {
		return (
			<div className="flex items-center justify-center py-10 text-gray-500 dark:text-gray-400">
				Gear not found.
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<GearCard
				data={gear}
				isEditable
				maxDistanceEditable={gear.type === GearType.SHOES}
			/>
			<Box title="Provider Connections">
				<div className="space-y-3">
					{providersList.map((provider) => {
						const providerId = connectionMap.get(provider);
						const isConnecting = pendingProvider === provider;
						return (
							<div
								key={provider}
								className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700 md:flex-row md:items-center md:justify-between"
							>
								<div>
									<Text className="text-sm font-semibold" text={provider} />
									<Text
										className="text-xs pt-1"
										variant="description"
										text={
											providerId
												? `Connected as ${providerId}`
												: "Not connected"
										}
									/>
								</div>
								<div className="flex items-center gap-3">
									<span
										className={cn(
											"px-2 py-1 text-xs font-semibold rounded-full",
											colors.providers[provider],
										)}
									>
										{provider}
									</span>
									{providerId ? (
										<button
											type="button"
											onClick={() => handleOpenProvider(provider, providerId)}
											className={cn(
												"rounded px-3 py-1 text-xs font-medium border",
												isDarkMode
													? "border-gray-600 text-gray-200 hover:bg-gray-700"
													: "border-gray-300 text-gray-700 hover:bg-gray-100",
											)}
										>
											Open
										</button>
									) : (
										<button
											type="button"
											onClick={() => handleConnect(provider)}
											disabled={isConnecting}
											className={cn(
												"rounded px-3 py-1 text-xs font-medium border",
												isDarkMode
													? "border-gray-600 text-gray-200 hover:bg-gray-700"
													: "border-gray-300 text-gray-700 hover:bg-gray-100",
												isConnecting && "opacity-60 cursor-not-allowed",
											)}
										>
											{isConnecting ? "Connecting..." : "Connect"}
										</button>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</Box>
		</div>
	);
}
