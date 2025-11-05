import {
	type IInbodyCreateInput,
	type IInbodyData,
	InbodyType,
} from "@repo/types";

export type MeasurementField = {
	name: keyof Omit<IInbodyCreateInput, "type" | "timestamp">;
	label: string;
	required?: boolean;
};

export const measurementFields: MeasurementField[] = [
	{ name: "weight", label: "Weight (kg)", required: true },
	{ name: "muscleMass", label: "Muscle Mass (kg)", required: true },
	{ name: "bodyFat", label: "Body Fat Mass (kg)", required: true },
	{ name: "bmi", label: "BMI (kg/m²)", required: true },
	{ name: "percentageBodyFat", label: "Body Fat (%)", required: true },
	{ name: "leanCore", label: "Lean Core (kg)" },
	{ name: "leanLeftArm", label: "Lean Left Arm (kg)" },
	{ name: "leanRightArm", label: "Lean Right Arm (kg)" },
	{ name: "leanLeftLeg", label: "Lean Left Leg (kg)" },
	{ name: "leanRightLeg", label: "Lean Right Leg (kg)" },
	{ name: "fatCore", label: "Fat Core (kg)" },
	{ name: "fatLeftArm", label: "Fat Left Arm (kg)" },
	{ name: "fatRightArm", label: "Fat Right Arm (kg)" },
	{ name: "fatLeftLeg", label: "Fat Left Leg (kg)" },
	{ name: "fatRightLeg", label: "Fat Right Leg (kg)" },
	{ name: "compositionBodyWater", label: "Body Water (kg)" },
	{ name: "compositionProtein", label: "Protein (kg)" },
	{ name: "compositionMinerals", label: "Minerals (kg)" },
	{ name: "compositionBodyFat", label: "Body Fat Composition (kg)" },
];

export type MeasurementValuesState = Record<MeasurementField["name"], string>;

export const createEmptyMeasurementValues = (): MeasurementValuesState =>
	Object.fromEntries(
		measurementFields.map((field) => [field.name, ""]),
	) as MeasurementValuesState;

export const createMeasurementValuesFromData = (
	data: Partial<Pick<IInbodyData, MeasurementField["name"]>>,
): MeasurementValuesState => {
	const values = createEmptyMeasurementValues();
	for (const field of measurementFields) {
		const rawValue = data[field.name];
		if (rawValue !== null && rawValue !== undefined) {
			values[field.name] = (rawValue / 100).toString();
		}
	}
	return values;
};

export const toDateTimeLocal = (value: string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	return date.toISOString().slice(0, 16);
};

export const resolveInbodyType = (value: unknown): InbodyType | null =>
	Object.values(InbodyType).includes(value as InbodyType)
		? (value as InbodyType)
		: null;
