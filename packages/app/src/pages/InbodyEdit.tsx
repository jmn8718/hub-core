import {
	type IInbodyData,
	type IInbodyUpdateInput,
	InbodyType,
} from "@repo/types";
import { cn } from "@repo/ui";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Box } from "../components/index.js";
import { Routes } from "../constants.js";
import { useDataClient, useTheme } from "../contexts/index.js";
import {
	type MeasurementValuesState,
	createEmptyMeasurementValues,
	createMeasurementValuesFromData,
	measurementFields,
	resolveInbodyType,
	toDateTimeLocal,
} from "./inbodyFormConfig.js";

type InbodyEditLocationState = {
	record?: IInbodyData;
	selectedType?: InbodyType;
	returnTo?: string;
} | null;

export function InbodyEdit() {
	const { client } = useDataClient();
	const { isDarkMode } = useTheme();
	const navigate = useNavigate();
	const location = useLocation();
	const { id } = useParams<{ id: string }>();
	const locationState = location.state as InbodyEditLocationState;
	const locationRecord = locationState?.record;
	const originSelectedType = resolveInbodyType(locationState?.selectedType);
	const returnTo = locationState?.returnTo ?? Routes.INBODY;

	useEffect(() => {
		if (!locationRecord || !id || locationRecord.id !== id) {
			navigate(returnTo, { replace: true });
		}
	}, [id, locationRecord, navigate, returnTo]);

	const initialRecord = locationRecord;

	const [entryType, setEntryType] = useState<InbodyType>(
		initialRecord?.type ?? originSelectedType ?? InbodyType.BASIC,
	);
	const [timestamp, setTimestamp] = useState<string>(
		toDateTimeLocal(initialRecord?.timestamp ?? new Date().toISOString()),
	);
	const [values, setValues] = useState<MeasurementValuesState>(
		initialRecord
			? createMeasurementValuesFromData(initialRecord)
			: createEmptyMeasurementValues(),
	);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const navigateToList = (typeToShow: InbodyType) => {
		navigate(returnTo, {
			replace: true,
			state: {
				selectedType: typeToShow,
			},
		});
	};

	const goBackToList = () => {
		navigateToList(initialRecord?.type ?? entryType);
	};

	const handleChange =
		(name: string) => (event: ChangeEvent<HTMLInputElement>) => {
			setValues((prev) => ({
				...prev,
				[name]: event.target.value,
			}));
		};

	const parseRequiredNumber = (value: string, label: string): number => {
		if (!value && value !== "0") {
			throw new Error(`${label} is required`);
		}
		const parsed = Number(value);
		if (Number.isNaN(parsed)) {
			throw new Error(`Invalid number for ${label}`);
		}
		return parsed;
	};

	const parseOptionalNumber = (value?: string): number | undefined => {
		if (value === "" || value === null || value === undefined) {
			return undefined;
		}
		const parsed = Number(value);
		return Number.isNaN(parsed) ? undefined : parsed;
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);
		try {
			const entryId = initialRecord?.id ?? id;
			if (!entryId) {
				throw new Error("Missing Inbody entry information");
			}
			if (!timestamp) {
				throw new Error("Date and time is required");
			}
			const isoTimestamp = new Date(timestamp);
			if (Number.isNaN(isoTimestamp.getTime())) {
				throw new Error("Invalid date and time");
			}

			const payload: IInbodyUpdateInput = {
				id: entryId,
				type: entryType,
				timestamp: isoTimestamp.toISOString(),
				weight: parseRequiredNumber(values.weight || "", "Weight"),
				muscleMass: parseRequiredNumber(values.muscleMass || "", "Muscle Mass"),
				bodyFat: parseRequiredNumber(values.bodyFat || "", "Body Fat Mass"),
				bmi: parseRequiredNumber(values.bmi || "", "BMI"),
				percentageBodyFat: parseRequiredNumber(
					values.percentageBodyFat || "",
					"Body Fat %",
				),
				leanCore: parseOptionalNumber(values.leanCore),
				leanLeftArm: parseOptionalNumber(values.leanLeftArm),
				leanRightArm: parseOptionalNumber(values.leanRightArm),
				leanLeftLeg: parseOptionalNumber(values.leanLeftLeg),
				leanRightLeg: parseOptionalNumber(values.leanRightLeg),
				fatCore: parseOptionalNumber(values.fatCore),
				fatLeftArm: parseOptionalNumber(values.fatLeftArm),
				fatRightArm: parseOptionalNumber(values.fatRightArm),
				fatLeftLeg: parseOptionalNumber(values.fatLeftLeg),
				fatRightLeg: parseOptionalNumber(values.fatRightLeg),
				compositionBodyWater: parseOptionalNumber(values.compositionBodyWater),
				compositionProtein: parseOptionalNumber(values.compositionProtein),
				compositionMinerals: parseOptionalNumber(values.compositionMinerals),
				compositionBodyFat: parseOptionalNumber(values.compositionBodyFat),
			};

			const result = await client.updateInbodyData(payload);
			if (!result.success) {
				throw new Error(result.error ?? "Unable to update Inbody entry");
			}
			navigateToList(payload.type);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={goBackToList}
					className={cn(
						"text-sm font-medium",
						isDarkMode ? "text-white" : "text-gray-500",
					)}
					disabled={isSubmitting}
				>
					← Back to Inbody history
				</button>

				<div className="flex flex-wrap items-center justify-end gap-3">
					<button
						type="button"
						onClick={goBackToList}
						className="rounded-full border border-gray-500 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
						disabled={isSubmitting}
					>
						Cancel
					</button>
					<button
						type="submit"
						className="rounded-full border border-indigo-500 bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={isSubmitting}
					>
						{isSubmitting ? "Saving..." : "Save Changes"}
					</button>
				</div>
			</div>

			<Box>
				<div className="space-y-6">
					{error ? (
						<div className="rounded border border-rose-500 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
							{error}
						</div>
					) : null}

					<div className="grid gap-4 md:grid-cols-2">
						<label className="flex flex-col gap-1 text-sm font-medium">
							<span>Entry Type</span>
							<select
								value={entryType}
								onChange={(event) =>
									setEntryType(event.target.value as InbodyType)
								}
								className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
							>
								{Object.values(InbodyType).map((type) => (
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
							<span>Date &amp; Time</span>
							<input
								type="datetime-local"
								value={timestamp}
								onChange={(event) => setTimestamp(event.target.value)}
								className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
								required
							/>
						</label>
					</div>

					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{measurementFields.map(({ name, label, required }) => (
							<label
								key={name}
								className="flex flex-col gap-1 text-sm font-medium"
							>
								<span>
									{label}
									{required ? " *" : ""}
								</span>
								<input
									type="number"
									step="0.01"
									value={values[name]}
									required={required}
									onChange={handleChange(name)}
									className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
								/>
							</label>
						))}
					</div>
				</div>
			</Box>
		</form>
	);
}
