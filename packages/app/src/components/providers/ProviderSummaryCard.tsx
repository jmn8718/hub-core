import { type Providers, StorageKeys } from "@repo/types";
import { cn } from "@repo/ui";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../contexts/index.js";
import { Box } from "../Box.js";

const storageKeyFor = (provider: Providers): StorageKeys =>
	StorageKeys[
		`${provider}_VALIDATED` as keyof typeof StorageKeys
	] as StorageKeys;

export function ProviderSummaryCard({
	provider,
	href,
	classes,
}: {
	provider: Providers;
	href: string;
	classes?: string;
}) {
	const { getValue } = useStore();
	const [isValidated, setIsValidated] = useState(false);

	useEffect(() => {
		let cancelled = false;

		void getValue<boolean>(storageKeyFor(provider)).then((value) => {
			if (!cancelled) {
				setIsValidated(Boolean(value));
			}
		});

		return () => {
			cancelled = true;
		};
	}, [getValue, provider]);

	const status = useMemo(
		() =>
			isValidated
				? {
						label: "Credentials valid",
						icon: <CheckCircle2 size={20} className="text-green-500" />,
					}
				: {
						label: "Credentials not validated",
						icon: <XCircle size={20} className="text-red-500" />,
					},
		[isValidated],
	);

	const accentClass = useMemo(() => {
		switch (provider) {
			case "COROS":
				return "border-l-blue-300";
			case "GARMIN":
				return "border-l-orange-300";
			case "STRAVA":
				return "border-l-red-300";
			default:
				return "border-l-slate-400";
		}
	}, [provider]);

	return (
		<Box classes={cn("border-l-4", accentClass, classes)}>
			<div className="flex items-center justify-between gap-4">
				<Link
					to={href}
					className="text-2xl font-bold uppercase text-current transition-colors hover:opacity-70"
				>
					{provider}
				</Link>
				<div
					className="inline-flex items-center"
					title={status.label}
					aria-label={status.label}
				>
					{status.icon}
				</div>
			</div>
		</Box>
	);
}
