import { type IInbodyCreateInput, InbodyType } from "@repo/types";
import { cn } from "@repo/ui";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box } from "../components/index.js";
import { Routes } from "../constants.js";
import { useDataClient, useTheme } from "../contexts/index.js";
import {
	formLabelClass,
	inputBaseClass,
	pillButtonBaseClass,
} from "../utils/style.js";
import {
	type MeasurementValuesState,
	createEmptyMeasurementValues,
	measurementFields,
	resolveInbodyType,
	toDateTimeLocal,
} from "./inbodyFormConfig.js";

export function InbodyAdd() {
	const { client } = useDataClient();
	const { colors } = useTheme();
	const navigate = useNavigate();
	const location = useLocation();
	const locationState = location.state as {
		returnTo?: string;
		selectedType?: InbodyType;
	} | null;

	const originSelectedType = resolveInbodyType(locationState?.selectedType);
	const returnTo = locationState?.returnTo ?? Routes.INBODY;

	const [entryType, setEntryType] = useState<InbodyType>(
		originSelectedType ?? InbodyType.BASIC,
	);
	const [timestamp, setTimestamp] = useState<string>(
		toDateTimeLocal(new Date().toISOString()),
	);
	const [values, setValues] = useState<MeasurementValuesState>(
		createEmptyMeasurementValues(),
	);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const inputClass = cn(inputBaseClass, "text-base", colors.input);
	const labelClass = cn(formLabelClass, colors.text, "flex flex-col gap-1");

	const navigateToList = (typeToShow: InbodyType) => {
		navigate(returnTo, {
			replace: true,
			state: {
				selectedType: typeToShow,
			},
		});
	};

	const goBackToList = () => {
		navigateToList(originSelectedType ?? entryType);
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
			if (!timestamp) {
				throw new Error("Date and time is required");
			}
			const isoTimestamp = new Date(timestamp);
			if (Number.isNaN(isoTimestamp.getTime())) {
				throw new Error("Invalid date and time");
			}

			const payload: IInbodyCreateInput = {
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

			const result = await client.createInbodyData(payload);
			if (!result.success) {
				throw new Error(result.error ?? "Unable to create Inbody entry");
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
					className={cn("text-sm font-medium", colors.text)}
					disabled={isSubmitting}
				>
					← Back to Inbody history
				</button>

				<div className="flex flex-wrap items-center justify-end gap-3">
					<button
						type="button"
						onClick={goBackToList}
						className={cn(pillButtonBaseClass, colors.buttonSecondary)}
						disabled={isSubmitting}
					>
						Cancel
					</button>
					<button
						type="submit"
						className={cn(
							pillButtonBaseClass,
							"font-semibold",
							colors.buttonPrimary,
						)}
						disabled={isSubmitting}
					>
						{isSubmitting ? "Saving..." : "Save Entry"}
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
						<label className={labelClass}>
							<span>Entry Type</span>
							<select
								value={entryType}
								onChange={(event) =>
									setEntryType(event.target.value as InbodyType)
								}
								className={inputClass}
							>
								{Object.values(InbodyType).map((type) => (
									<option key={type} value={type}>
										{type.charAt(0).toUpperCase() + type.slice(1)}
									</option>
								))}
							</select>
						</label>
						<label className={labelClass}>
							<span>Date &amp; Time</span>
							<input
								type="datetime-local"
								value={timestamp}
								onChange={(event) => setTimestamp(event.target.value)}
								className={inputClass}
								required
							/>
						</label>
					</div>

					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{measurementFields.map(({ name, label, required }) => (
							<label key={name} className={labelClass}>
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
									className={inputClass}
								/>
							</label>
						))}
					</div>
				</div>
			</Box>
		</form>
	);
}
