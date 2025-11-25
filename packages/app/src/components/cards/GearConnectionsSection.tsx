import type { IDbGear, Providers } from "@repo/types";
import { cn } from "@repo/ui";
import { Cable, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { useDataClient, useLoading, useTheme } from "../../contexts/index.js";
import { Box } from "../Box.js";
import { Text } from "../Text.js";

interface GearConnectionsSectionProps {
	activityId: string;
	selectedGearIds: string[];
	providers: Providers[];
	gears: IDbGear[];
	refreshActivity: () => Promise<void>;
}

type GearConnectionOverrides = Record<string, Providers[]>;

export function GearConnectionsSection({
	activityId,
	selectedGearIds,
	providers,
	gears,
	refreshActivity,
}: GearConnectionsSectionProps) {
	const { isDarkMode, colors } = useTheme();
	const { client } = useDataClient();
	const { setLocalLoading } = useLoading();
	const [connectingKey, setConnectingKey] = useState<string | null>(null);
	const [overrides, setOverrides] = useState<GearConnectionOverrides>({});

	const activityProviders = useMemo(
		() => Array.from(new Set(providers)),
		[providers],
	);

	const selectedGears = useMemo(() => {
		const ids = new Set(selectedGearIds);
		return gears.filter((gear) => ids.has(gear.id));
	}, [gears, selectedGearIds]);

	if (selectedGears.length === 0 || activityProviders.length === 0) {
		return null;
	}

	const handleConnect = async (gear: IDbGear, provider: Providers) => {
		const hasProviderConnection = gear.providerConnections?.some(
			(connection) => connection.provider === provider,
		);
		if (!hasProviderConnection) {
			toast.error(
				`${gear.name} is not synced with ${provider}. Sync your gear first.`,
				{
					transition: Bounce,
				},
			);
			return;
		}
		const key = `${gear.id}-${provider}`;
		setConnectingKey(key);
		setLocalLoading(true);
		const result = await client.providerGearLink(activityId, gear.id);
		if (!result.success) {
			toast.error(result.error, {
				transition: Bounce,
			});
		} else {
			toast.success(`${gear.name} connected to ${provider}`, {
				transition: Bounce,
			});
			setOverrides((current) => {
				const existing = new Set(current[gear.id] ?? []);
				existing.add(provider);
				return {
					...current,
					[gear.id]: Array.from(existing),
				};
			});
			await refreshActivity();
		}
		setTimeout(() => {
			setConnectingKey(null);
			setLocalLoading(false);
		}, 200);
	};

	const isGearConnected = (gear: IDbGear, provider: Providers) => {
		if (gear.providerConnections?.some((conn) => conn.provider === provider)) {
			return true;
		}
		return overrides[gear.id]?.includes(provider) ?? false;
	};

	return (
		<Box title="Gear connections" icon={Cable}>
			<div className="space-y-3">
				{selectedGears.map((gear) => (
					<div key={gear.id} className="rounded-lg border p-3">
						<Text className="font-semibold" text={gear.name} />
						<div className="mt-2 flex flex-wrap gap-2">
							{activityProviders.map((provider) => {
								const connected = isGearConnected(gear, provider);
								const key = `${gear.id}-${provider}`;
								return (
									<div
										key={key}
										className="flex items-center gap-2 rounded-full px-2 py-1"
									>
										<span
											className={cn(
												"px-2 py-1 text-xs font-semibold rounded-full",
												colors.providers[provider],
											)}
										>
											{provider}
										</span>
										{connected ? (
											<CheckCircle2 size={16} className="text-green-500" />
										) : (
											<button
												type="button"
												onClick={() => handleConnect(gear, provider)}
												disabled={connectingKey === key}
												className={cn(
													"rounded px-3 py-1 text-xs font-medium border",
													isDarkMode
														? "border-gray-600 text-gray-200 hover:bg-gray-700"
														: "border-gray-300 text-gray-700 hover:bg-gray-100",
													connectingKey === key &&
														"opacity-60 cursor-not-allowed",
												)}
											>
												{connectingKey === key ? "Connecting..." : "Connect"}
											</button>
										)}
									</div>
								);
							})}
						</div>
					</div>
				))}
			</div>
		</Box>
	);
}
