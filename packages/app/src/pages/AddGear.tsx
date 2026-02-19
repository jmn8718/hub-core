import { GearType, type IGearCreateInput } from "@repo/types";
import { cn } from "@repo/ui";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bounce, toast } from "react-toastify";
import { Box } from "../components/Box.js";
import { Routes } from "../constants.js";
import { useDataClient, useTheme } from "../contexts/index.js";

const gearTypes: readonly GearType[] = [
	GearType.SHOES,
	GearType.INSOLE,
	GearType.BIKE,
	GearType.OTHER,
] as const;

const todayAsDateInput = () => new Date().toISOString().slice(0, 10);

export function AddGear() {
	const { client } = useDataClient();
	const { isDarkMode } = useTheme();
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [code, setCode] = useState("");
	const [brand, setBrand] = useState("");
	const [gearType, setGearType] = useState<GearType>(GearType.SHOES);
	const [dateBegin, setDateBegin] = useState(todayAsDateInput());
	const [maximumDistance, setMaximumDistance] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);

		if (!name.trim()) {
			setError("Name is required");
			return;
		}

		if (!code.trim()) {
			setError("Code is required");
			return;
		}

		const parsedMaxDistance =
			maximumDistance.trim() === ""
				? undefined
				: Math.max(0, Number(maximumDistance));

		if (parsedMaxDistance !== undefined && Number.isNaN(parsedMaxDistance)) {
			setError("Max distance must be a valid number");
			return;
		}

		const payload: IGearCreateInput = {
			name: name.trim(),
			code: code.trim(),
			type: gearType,
			brand: brand.trim() || undefined,
			dateBegin: dateBegin || undefined,
			maximumDistance:
				parsedMaxDistance !== undefined
					? Math.round(parsedMaxDistance * 1000)
					: undefined,
		};

		setIsSubmitting(true);
		try {
			const result = await client.createGear(payload);
			if (!result.success) {
				throw new Error(result.error ?? "Unable to create gear");
			}
			toast.success("Gear created", { transition: Bounce });
			navigate(`${Routes.GEAR}/${result.id}`);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="flex items-center justify-between">
				<Link
					className={cn(
						"text-sm font-medium",
						isDarkMode ? "text-white" : "text-gray-600",
					)}
					to={Routes.GEAR}
				>
					← Back to Gear
				</Link>
				<div className="flex items-center gap-3">
					<Link
						className={cn(
							"rounded-full border px-4 py-2 text-sm font-medium",
							isDarkMode
								? "border-gray-600 text-gray-200"
								: "border-gray-400 text-gray-700",
						)}
						to={Routes.GEAR}
					>
						Cancel
					</Link>
					<button
						type="submit"
						disabled={isSubmitting}
						className="rounded-full border border-indigo-500 bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSubmitting ? "Saving..." : "Save Gear"}
					</button>
				</div>
			</div>
			<Box title="Add Gear" description="Create a new piece of gear">
				<div className="space-y-4">
					{error ? (
						<div className="rounded border border-rose-500 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
							{error}
						</div>
					) : null}
					<div className="grid gap-4 md:grid-cols-2">
						<label className="flex flex-col gap-1 text-sm font-medium">
							<span>Name *</span>
							<input
								type="text"
								value={name}
								onChange={(event) => setName(event.target.value)}
								required
								className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm font-medium">
							<span>Code *</span>
							<input
								type="text"
								value={code}
								onChange={(event) => setCode(event.target.value)}
								required
								className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm font-medium">
							<span>Type *</span>
							<select
								value={gearType}
								onChange={(event) =>
									setGearType(event.target.value as GearType)
								}
								className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
							>
								{gearTypes.map((type) => (
									<option
										key={type}
										value={type}
										className="bg-gray-900 text-white"
									>
										{type.charAt(0).toUpperCase() + type.slice(1)}
									</option>
								))}
							</select>
						</label>
						<label className="flex flex-col gap-1 text-sm font-medium">
							<span>Brand</span>
							<input
								type="text"
								value={brand}
								onChange={(event) => setBrand(event.target.value)}
								className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm font-medium">
							<span>Start Date</span>
							<input
								type="date"
								value={dateBegin}
								onChange={(event) => setDateBegin(event.target.value)}
								className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm font-medium">
							<span>Max Distance (km)</span>
							<input
								type="number"
								min="0"
								step="1"
								value={maximumDistance}
								onChange={(event) => setMaximumDistance(event.target.value)}
								className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
							/>
						</label>
					</div>
				</div>
			</Box>
		</form>
	);
}
