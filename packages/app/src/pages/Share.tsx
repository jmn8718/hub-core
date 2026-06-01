import { dayjs } from "@repo/dates";
import { ActivityType, type DbActivityPopulated } from "@repo/types";
import { cn } from "@repo/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bounce, toast } from "react-toastify";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ReferenceLine,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from "recharts";
import { useDataClient, useLoading } from "../contexts/index.js";
import { formatPace } from "../utils/formatters.js";

type PeriodType = "week" | "month" | "year";

type ChartPoint = {
	key: string;
	label: string;
	distanceKm: number;
};

type ColorOption = {
	id: string;
	label: string;
	value: string;
};

type PeriodValueInputProps = {
	period: PeriodType;
	value: string;
	onChange: (value: string) => void;
	inputRef: RefObject<HTMLInputElement | HTMLSelectElement | null>;
	className?: string;
};

const SHARE_LIME = "#D8FF27";
const PERIOD_PARAM = "period";
const VALUE_PARAM = "value";
const PERIOD_OPTIONS: PeriodType[] = ["week", "month", "year"];
const YEAR_OPTIONS = Array.from({ length: 101 }, (_, index) =>
	String(2100 - index),
);
const FONT_COLOR_OPTIONS: [ColorOption, ...ColorOption[]] = [
	{ id: "ink", label: "Ink", value: "#0B132B" },
	{ id: "white", label: "White", value: "#FFFFFF" },
	{ id: "charcoal", label: "Charcoal", value: "#1F2937" },
	{ id: "forest", label: "Forest", value: "#14532D" },
	{ id: "plum", label: "Plum", value: "#4C1D95" },
	{ id: "brick", label: "Brick", value: "#7F1D1D" },
];
const BACKGROUND_COLOR_OPTIONS: [ColorOption, ...ColorOption[]] = [
	{ id: "transparent", label: "Transparent", value: "transparent" },
	{ id: "white", label: "White", value: "#FFFFFF" },
	{ id: "ink", label: "Ink", value: "#0B132B" },
	{ id: "charcoal", label: "Charcoal", value: "#111827" },
	{ id: "sand", label: "Sand", value: "#F3EAD8" },
	{ id: "mint", label: "Mint", value: "#ECFDF5" },
];

const hexToRgb = (value: string) => {
	if (!value.startsWith("#")) {
		return null;
	}
	const normalized = value.slice(1);
	const full =
		normalized.length === 3
			? normalized
					.split("")
					.map((char) => `${char}${char}`)
					.join("")
			: normalized;
	if (full.length !== 6) {
		return null;
	}
	const parsed = Number.parseInt(full, 16);
	if (Number.isNaN(parsed)) {
		return null;
	}
	return {
		r: (parsed >> 16) & 255,
		g: (parsed >> 8) & 255,
		b: parsed & 255,
	};
};

const withAlpha = (value: string, alpha: number) => {
	if (value === "transparent") {
		return `rgba(148, 163, 184, ${alpha})`;
	}
	const rgb = hexToRgb(value);
	if (!rgb) {
		return value;
	}
	return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const startOfIsoWeek = (value: string | Date) => {
	const date = new Date(value);
	const utcDate = new Date(
		Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
	);
	const day = utcDate.getUTCDay() || 7;
	utcDate.setUTCDate(utcDate.getUTCDate() - day + 1);
	return dayjs(utcDate);
};

const getIsoWeekNumber = (value: string | Date) => {
	const date = new Date(value);
	const utcDate = new Date(
		Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
	);
	const day = utcDate.getUTCDay() || 7;
	utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
	const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
	return Math.ceil(
		((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
	);
};

const formatWeekValue = (value: string | Date) => {
	const weekStart = startOfIsoWeek(value);
	const year = weekStart.add(3, "day").year();
	const weekNumber = getIsoWeekNumber(weekStart.toDate());
	return `${year}-W${String(weekNumber).padStart(2, "0")}`;
};

const parseWeekValue = (value: string) => {
	if (!/^\d{4}-W\d{2}$/.test(value)) {
		return null;
	}
	const [yearText, weekText] = value.split("-W");
	const year = Number(yearText);
	const week = Number(weekText);
	if (Number.isNaN(year) || Number.isNaN(week)) {
		return null;
	}

	const jan4 = new Date(Date.UTC(year, 0, 4));
	const jan4Day = jan4.getUTCDay() || 7;
	const weekOneMonday = new Date(jan4);
	weekOneMonday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
	weekOneMonday.setUTCDate(weekOneMonday.getUTCDate() + (week - 1) * 7);
	return dayjs(weekOneMonday);
};

const isValidPeriodType = (value: string | null): value is PeriodType =>
	PERIOD_OPTIONS.includes(value as PeriodType);

const getCurrentValue = (period: PeriodType) => {
	if (period === "week") {
		return formatWeekValue(new Date());
	}
	if (period === "year") {
		return dayjs().format("YYYY");
	}
	return dayjs().format("YYYY-MM");
};

const isValidValue = (period: PeriodType, value: string | null) => {
	if (!value) {
		return false;
	}
	if (period === "week") {
		return parseWeekValue(value) !== null;
	}
	if (period === "year") {
		return /^\d{4}$/.test(value);
	}
	return /^\d{4}-\d{2}$/.test(value);
};

const getPeriodBounds = (period: PeriodType, value: string) => {
	if (period === "week") {
		const start = parseWeekValue(value) ?? startOfIsoWeek(new Date());
		return {
			start,
			end: start.add(6, "day").endOf("day"),
		};
	}
	if (period === "year") {
		const start = dayjs(`${value}-01-01`).startOf("year");
		return {
			start,
			end: start.endOf("year"),
		};
	}
	const start = dayjs(`${value}-01`).startOf("month");
	return {
		start,
		end: start.endOf("month"),
	};
};

const getPeriodLabel = (period: PeriodType, value: string) => {
	if (period === "week") {
		const start = parseWeekValue(value) ?? startOfIsoWeek(new Date());
		const end = start.add(6, "day");
		return `${start.format("MMM D")} - ${end.format("MMM D, YYYY")}`;
	}
	if (period === "year") {
		return value;
	}
	return dayjs(`${value}-01`).format("MMMM YYYY");
};

const shiftValue = (
	period: PeriodType,
	value: string,
	direction: "previous" | "next",
) => {
	const delta = direction === "previous" ? -1 : 1;
	if (period === "week") {
		const start = parseWeekValue(value) ?? startOfIsoWeek(new Date());
		return formatWeekValue(start.add(delta, "week").toDate());
	}
	if (period === "year") {
		return String(Number(value) + delta);
	}
	return dayjs(`${value}-01`).add(delta, "month").format("YYYY-MM");
};

const formatHourClock = (seconds: number) => {
	const totalSeconds = Math.max(0, Math.round(seconds));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const remainder = totalSeconds % 60;
	return `${hours}:${`${minutes}`.padStart(2, "0")}:${`${remainder}`.padStart(2, "0")}`;
};

const formatDistanceNumber = (meters: number) => (meters / 1000).toFixed(1);

const formatYAxisTick = (value: number) => `${value}km`;

const inlineComputedStyles = (source: HTMLElement, target: HTMLElement) => {
	const computed = window.getComputedStyle(source);
	for (const property of computed) {
		target.style.setProperty(
			property,
			computed.getPropertyValue(property),
			computed.getPropertyPriority(property),
		);
	}
};

const cloneNodeWithInlineStyles = (node: HTMLElement): HTMLElement => {
	const clone = node.cloneNode(false) as HTMLElement;
	inlineComputedStyles(node, clone);

	for (const child of Array.from(node.childNodes)) {
		if (child.nodeType === Node.TEXT_NODE) {
			clone.appendChild(child.cloneNode(false));
			continue;
		}

		if (child instanceof HTMLElement) {
			if (child.dataset.exportHidden === "true") {
				continue;
			}
			clone.appendChild(cloneNodeWithInlineStyles(child));
			continue;
		}

		if (child instanceof SVGElement) {
			const svgClone = child.cloneNode(true) as SVGElement;
			clone.appendChild(svgClone);
		}
	}

	return clone;
};

const exportElementToTransparentPng = async (element: HTMLElement) => {
	const rect = element.getBoundingClientRect();
	const clone = cloneNodeWithInlineStyles(element);
	clone.style.margin = "0";
	clone.style.width = `${Math.ceil(rect.width)}px`;
	clone.style.height = `${Math.ceil(rect.height)}px`;

	const serialized = new XMLSerializer().serializeToString(clone);
	const svg = `
		<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(rect.width)}" height="${Math.ceil(rect.height)}" viewBox="0 0 ${Math.ceil(rect.width)} ${Math.ceil(rect.height)}">
			<foreignObject width="100%" height="100%">
				<div xmlns="http://www.w3.org/1999/xhtml" style="width:${Math.ceil(rect.width)}px;height:${Math.ceil(rect.height)}px;">
					${serialized}
				</div>
			</foreignObject>
		</svg>
	`;
	const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

	try {
		const image = await new Promise<HTMLImageElement>((resolve, reject) => {
			const nextImage = new Image();
			nextImage.onload = () => resolve(nextImage);
			nextImage.onerror = () =>
				reject(new Error("Unable to render share image"));
			nextImage.src = url;
		});

		const scale = Math.max(2, window.devicePixelRatio || 1);
		const canvas = document.createElement("canvas");
		canvas.width = Math.ceil(rect.width * scale);
		canvas.height = Math.ceil(rect.height * scale);
		const context = canvas.getContext("2d");
		if (!context) {
			throw new Error("Canvas export is not available");
		}

		context.clearRect(0, 0, canvas.width, canvas.height);
		context.scale(scale, scale);
		context.drawImage(image, 0, 0, rect.width, rect.height);

		return await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob((pngBlob) => {
				if (!pngBlob) {
					reject(new Error("Failed to generate share image"));
					return;
				}
				resolve(pngBlob);
			}, "image/png");
		});
	} finally {
		// no-op for data URLs
	}
};

const buildChartData = (
	activities: DbActivityPopulated[],
	period: PeriodType,
	value: string,
): ChartPoint[] => {
	const totals = new Map<string, number>();
	for (const activity of activities) {
		const date = dayjs(activity.timestamp);
		const key =
			period === "year" ? date.format("YYYY-MM") : date.format("YYYY-MM-DD");
		totals.set(key, (totals.get(key) ?? 0) + activity.distance);
	}

	if (period === "week") {
		const start = parseWeekValue(value) ?? startOfIsoWeek(new Date());
		return Array.from({ length: 7 }, (_, index) => {
			const target = start.add(index, "day");
			const key = target.format("YYYY-MM-DD");
			return {
				key,
				label: target.format("dd"),
				distanceKm: Number(((totals.get(key) ?? 0) / 1000).toFixed(2)),
			};
		});
	}

	if (period === "year") {
		const start = dayjs(`${value}-01-01`).startOf("year");
		return Array.from({ length: 12 }, (_, index) => {
			const target = start.add(index, "month");
			const key = target.format("YYYY-MM");
			return {
				key,
				label: target.format("MMM").toUpperCase(),
				distanceKm: Number(((totals.get(key) ?? 0) / 1000).toFixed(2)),
			};
		});
	}

	const start = dayjs(`${value}-01`).startOf("month");
	return Array.from({ length: start.daysInMonth() }, (_, index) => {
		const target = start.date(index + 1);
		const key = target.format("YYYY-MM-DD");
		return {
			key,
			label: target.format("D"),
			distanceKm: Number(((totals.get(key) ?? 0) / 1000).toFixed(2)),
		};
	});
};

function PeriodValueInput({
	period,
	value,
	onChange,
	inputRef,
	className = "",
}: PeriodValueInputProps) {
	if (period === "year") {
		return (
			<select
				ref={inputRef as RefObject<HTMLSelectElement>}
				aria-label="Select year"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className={className}
			>
				{YEAR_OPTIONS.map((year) => (
					<option key={year} value={year}>
						{year}
					</option>
				))}
			</select>
		);
	}

	return (
		<input
			ref={inputRef as RefObject<HTMLInputElement>}
			aria-label={period === "week" ? "Select week" : "Select month"}
			type={period === "week" ? "week" : "month"}
			value={value}
			onChange={(event) => onChange(event.target.value)}
			className={className}
		/>
	);
}

export function Share() {
	const { client } = useDataClient();
	const { setGlobalLoading } = useLoading();
	const [searchParams, setSearchParams] = useSearchParams();
	const [activities, setActivities] = useState<DbActivityPopulated[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const periodInputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(
		null,
	);
	const shareCardRef = useRef<HTMLDivElement | null>(null);
	const [isSharing, setIsSharing] = useState(false);
	const [fontColor, setFontColor] = useState(FONT_COLOR_OPTIONS[0].value);
	const [backgroundColor, setBackgroundColor] = useState(
		BACKGROUND_COLOR_OPTIONS[0].value,
	);
	const currentPeriodParam = searchParams.get(PERIOD_PARAM);
	const selectedPeriod: PeriodType = isValidPeriodType(currentPeriodParam)
		? currentPeriodParam
		: "month";
	const currentValueParam = searchParams.get(VALUE_PARAM);
	const selectedValue: string =
		isValidValue(selectedPeriod, currentValueParam) && currentValueParam
			? currentValueParam
			: getCurrentValue(selectedPeriod);

	useEffect(() => {
		if (
			!isValidPeriodType(currentPeriodParam) ||
			!isValidValue(selectedPeriod, currentValueParam)
		) {
			setSearchParams(
				(current) => {
					const next = new URLSearchParams(current);
					next.set(PERIOD_PARAM, selectedPeriod);
					next.set(VALUE_PARAM, selectedValue);
					return next;
				},
				{ replace: true },
			);
		}
	}, [
		currentPeriodParam,
		currentValueParam,
		selectedPeriod,
		selectedValue,
		setSearchParams,
	]);

	const bounds = useMemo(
		() => getPeriodBounds(selectedPeriod, selectedValue),
		[selectedPeriod, selectedValue],
	);

	useEffect(() => {
		let cancelled = false;

		const fetchActivities = async () => {
			setIsLoading(true);
			setGlobalLoading(true);
			try {
				const result = await client.getActivities({
					type: ActivityType.RUN,
					startDate: bounds.start.format("YYYY-MM-DD"),
					endDate: bounds.end.format("YYYY-MM-DD"),
					limit: 2000,
				});

				if (cancelled) {
					return;
				}

				if (!result.success) {
					toast.error(result.error, {
						hideProgressBar: false,
						closeOnClick: false,
						transition: Bounce,
					});
					setActivities([]);
					return;
				}

				const sorted = [...result.data.data].sort(
					(a, b) =>
						new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
				);
				setActivities(sorted);
			} catch (error) {
				if (cancelled) {
					return;
				}
				toast.error((error as Error).message, {
					hideProgressBar: false,
					closeOnClick: false,
					transition: Bounce,
				});
				setActivities([]);
			} finally {
				if (!cancelled) {
					setGlobalLoading(false);
					setIsLoading(false);
				}
			}
		};

		void fetchActivities();

		return () => {
			cancelled = true;
			setGlobalLoading(false);
		};
	}, [bounds.end, bounds.start, client, setGlobalLoading]);

	const summary = useMemo(() => {
		const totalDistance = activities.reduce(
			(sum, activity) => sum + activity.distance,
			0,
		);
		const totalDuration = activities.reduce(
			(sum, activity) => sum + activity.duration,
			0,
		);
		const runCount = activities.length;
		const averagePace =
			totalDistance > 0 ? totalDuration / (totalDistance / 1000) : 0;
		const averageDistancePerRun =
			runCount > 0 ? Number((totalDistance / 1000 / runCount).toFixed(2)) : 0;

		return {
			totalDistance,
			totalDuration,
			runCount,
			averagePace,
			averageDistancePerRun,
		};
	}, [activities]);

	const chartData = useMemo(
		() => buildChartData(activities, selectedPeriod, selectedValue),
		[activities, selectedPeriod, selectedValue],
	);

	const maxDistance = useMemo(
		() => Math.max(...chartData.map((entry) => entry.distanceKm), 0),
		[chartData],
	);

	const yAxisMax = useMemo(() => {
		if (maxDistance <= 0) {
			return 5;
		}
		return Math.ceil(maxDistance / 5) * 5;
	}, [maxDistance]);

	const setPeriodSelection = (period: PeriodType) => {
		setSearchParams(
			(current) => {
				const next = new URLSearchParams(current);
				next.set(PERIOD_PARAM, period);
				next.set(VALUE_PARAM, getCurrentValue(period));
				return next;
			},
			{ replace: false },
		);
	};

	const setValueSelection = (value: string) => {
		setSearchParams(
			(current) => {
				const next = new URLSearchParams(current);
				next.set(PERIOD_PARAM, selectedPeriod);
				next.set(VALUE_PARAM, value);
				return next;
			},
			{ replace: false },
		);
	};

	const shiftPeriod = (direction: "previous" | "next") => {
		setValueSelection(shiftValue(selectedPeriod, selectedValue, direction));
	};

	const openPeriodSelector = () => {
		const element = periodInputRef.current;
		if (!element) {
			return;
		}

		if (
			element instanceof HTMLInputElement &&
			typeof (element as HTMLInputElement & { showPicker?: () => void })
				.showPicker === "function"
		) {
			(
				element as HTMLInputElement & {
					showPicker: () => void;
				}
			).showPicker();
			return;
		}

		element.focus();
		element.click();
	};

	const tickValues = useMemo(() => {
		if (selectedPeriod === "week") {
			return chartData.map((entry) => entry.label);
		}
		if (selectedPeriod === "year") {
			return chartData.map((entry) => entry.label);
		}
		return chartData
			.filter(
				(entry, index) =>
					index === 0 ||
					Number(entry.label) % 7 === 1 ||
					index === chartData.length - 1,
			)
			.map((entry) => entry.label);
	}, [chartData, selectedPeriod]);

	const secondaryFontColor = withAlpha(fontColor, 0.5);
	const gridColor = withAlpha(fontColor, 0.18);
	const referenceColor = withAlpha(fontColor, 0.45);

	const handleShare = async () => {
		if (!shareCardRef.current || isSharing) {
			return;
		}

		setIsSharing(true);
		try {
			const pngBlob = await exportElementToTransparentPng(shareCardRef.current);
			const fileName = `hub-core-${selectedPeriod}-${selectedValue}.png`;
			const file = new File([pngBlob], fileName, { type: "image/png" });

			if (
				typeof navigator !== "undefined" &&
				"canShare" in navigator &&
				"share" in navigator &&
				navigator.canShare?.({ files: [file] })
			) {
				await navigator.share({
					files: [file],
					title: `${getPeriodLabel(selectedPeriod, selectedValue)} stats`,
				});
				return;
			}

			const downloadUrl = URL.createObjectURL(pngBlob);
			const anchor = document.createElement("a");
			anchor.href = downloadUrl;
			anchor.download = fileName;
			anchor.click();
			URL.revokeObjectURL(downloadUrl);
			toast.success("Share image downloaded.", {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		} catch (error) {
			if ((error as Error).name !== "AbortError") {
				toast.error((error as Error).message, {
					hideProgressBar: false,
					closeOnClick: false,
					transition: Bounce,
				});
			}
		} finally {
			setIsSharing(false);
		}
	};

	return (
		<div className="flex justify-center px-4 py-6 sm:px-6">
			<div className="w-full max-w-[460px]">
				<section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
					<div className="px-5 pb-6 pt-5">
						<div className="rounded-full border border-slate-200 p-1">
							<div className="grid grid-cols-3 gap-1 text-center text-lg font-medium text-slate-400">
								{PERIOD_OPTIONS.map((period) => {
									const active = period === selectedPeriod;
									return (
										<button
											key={period}
											type="button"
											onClick={() => setPeriodSelection(period)}
											className={cn(
												"rounded-full px-3 py-2 transition-colors",
												active ? "text-slate-950" : "text-slate-400",
											)}
											style={
												active ? { backgroundColor: SHARE_LIME } : undefined
											}
										>
											{period === "week" ? "W" : period === "month" ? "M" : "Y"}
										</button>
									);
								})}
							</div>
						</div>

						<div
							ref={shareCardRef}
							className="mt-8"
							style={{ backgroundColor }}
						>
							<div className="flex items-center justify-between gap-3">
								<button
									type="button"
									onClick={() => shiftPeriod("previous")}
									data-export-hidden="true"
									className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-950"
									aria-label={`Previous ${selectedPeriod}`}
								>
									<ChevronLeft className="h-5 w-5" />
								</button>
								<div className="relative flex min-w-0 flex-1 justify-center">
									<button
										type="button"
										onClick={openPeriodSelector}
										className="relative flex min-w-0 flex-1 items-center justify-center text-center"
										style={{ color: fontColor }}
									>
										<span className="block min-w-0 truncate whitespace-nowrap text-center text-[clamp(1.6rem,5vw,2rem)] font-semibold tracking-[-0.04em]">
											{getPeriodLabel(selectedPeriod, selectedValue)}
										</span>
									</button>
									<PeriodValueInput
										period={selectedPeriod}
										value={selectedValue}
										onChange={setValueSelection}
										inputRef={periodInputRef}
										className={
											selectedPeriod === "year"
												? "absolute inset-0 cursor-pointer opacity-0"
												: "sr-only"
										}
									/>
									{selectedPeriod === "year" ? (
										<PeriodValueInput
											period={selectedPeriod}
											value={selectedValue}
											onChange={setValueSelection}
											inputRef={periodInputRef}
											className="absolute inset-0 cursor-pointer opacity-0"
										/>
									) : null}
								</div>
								<button
									type="button"
									onClick={() => shiftPeriod("next")}
									data-export-hidden="true"
									className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-950"
									aria-label={`Next ${selectedPeriod}`}
								>
									<ChevronRight className="h-5 w-5" />
								</button>
							</div>

							<div className="mt-7 min-w-0">
								<div className="flex items-end gap-3">
									<div
										className="min-w-0 whitespace-nowrap text-[clamp(4rem,18vw,6.6rem)] font-black italic leading-[0.9] tracking-[-0.07em]"
										style={{ color: fontColor }}
									>
										{formatDistanceNumber(summary.totalDistance)}
									</div>
									<div
										className="pb-1 text-[clamp(1.6rem,5vw,2.1rem)] font-medium italic leading-none"
										style={{ color: secondaryFontColor }}
									>
										Km
									</div>
								</div>
							</div>

							<div className="mt-10 grid grid-cols-[1fr_1.5fr_1.5fr] gap-5">
								<div className="min-w-0">
									<div
										className="whitespace-nowrap text-[clamp(1.7rem,6vw,2.15rem)] font-bold tracking-[-0.05em]"
										style={{ color: fontColor }}
									>
										{summary.runCount}
									</div>
									<div
										className="mt-0.5 text-[clamp(1.1rem,4vw,1.25rem)] font-medium italic"
										style={{ color: secondaryFontColor }}
									>
										Runs
									</div>
								</div>
								<div className="min-w-0">
									<div
										className="whitespace-nowrap text-[clamp(1.7rem,6vw,2.15rem)] font-bold tracking-[-0.05em]"
										style={{ color: fontColor }}
									>
										{summary.totalDistance > 0
											? formatPace(summary.averagePace, true)
											: "0:00 /km"}
									</div>
									<div
										className="mt-0.5 text-[clamp(1.1rem,4vw,1.25rem)] font-medium italic"
										style={{ color: secondaryFontColor }}
									>
										Avg. Pace
									</div>
								</div>
								<div className="min-w-0">
									<div
										className="whitespace-nowrap text-[clamp(1.7rem,6vw,2.15rem)] font-bold tracking-[-0.05em]"
										style={{ color: fontColor }}
									>
										{formatHourClock(summary.totalDuration)}
									</div>
									<div
										className="mt-0.5 text-[clamp(1.1rem,4vw,1.25rem)] font-medium italic"
										style={{ color: secondaryFontColor }}
									>
										Time
									</div>
								</div>
							</div>

							<div className="mt-12 border-t border-slate-200 pt-6">
								<div className="h-[280px]">
									{isLoading ? (
										<div className="flex h-full items-center justify-center text-lg text-slate-400">
											Loading stats…
										</div>
									) : (
										<ResponsiveContainer width="100%" height="100%">
											<BarChart
												data={chartData}
												margin={{ top: 10, right: 6, left: 4, bottom: 10 }}
												barCategoryGap={
													selectedPeriod === "year" ? "22%" : "35%"
												}
											>
												<CartesianGrid
													vertical={false}
													stroke={gridColor}
													strokeDasharray="0"
												/>
												<XAxis
													dataKey="label"
													axisLine={false}
													tickLine={false}
													tickMargin={10}
													padding={{ left: 10, right: 10 }}
													tick={{
														fill: secondaryFontColor,
														fontSize: 15,
														fontWeight: 500,
													}}
													ticks={tickValues}
												/>
												<YAxis
													orientation="right"
													domain={[0, yAxisMax]}
													axisLine={false}
													tickLine={false}
													tickMargin={8}
													width={44}
													tickFormatter={formatYAxisTick}
													tick={{
														fill: secondaryFontColor,
														fontSize: 14,
													}}
												/>
												<ReferenceLine
													y={summary.averageDistancePerRun}
													stroke={referenceColor}
													strokeDasharray="3 3"
													label={{
														value: summary.averageDistancePerRun.toFixed(2),
														position: "right",
														fill: referenceColor,
														fontSize: 13,
													}}
												/>
												<Bar
													dataKey="distanceKm"
													radius={[999, 999, 0, 0]}
													fill={fontColor}
													maxBarSize={selectedPeriod === "year" ? 16 : 10}
												/>
											</BarChart>
										</ResponsiveContainer>
									)}
								</div>
							</div>
						</div>

						<div className="mt-4 flex items-center justify-between text-sm font-medium text-slate-400">
							<span>
								{selectedPeriod === "week"
									? "Weekly run distance"
									: selectedPeriod === "year"
										? "Yearly run distance"
										: "Monthly run distance"}
							</span>
							<span
								className={cn(
									"rounded-full px-3 py-1 text-slate-950",
									summary.runCount > 0 ? "bg-lime-100" : "bg-slate-100",
								)}
							>
								{summary.runCount > 0
									? `${summary.averageDistancePerRun.toFixed(2)} km avg`
									: "No runs yet"}
							</span>
						</div>
					</div>
				</section>
				<div className="mt-5 flex justify-center">
					<button
						type="button"
						onClick={() => void handleShare()}
						disabled={isSharing}
						className="rounded-full border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-900 transition-colors hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSharing ? "Generating…" : "Share"}
					</button>
				</div>
				<div className="mt-5 grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
					<div>
						<div className="mb-2 text-sm font-semibold text-slate-700">
							Font color
						</div>
						<div className="flex flex-wrap gap-2">
							{FONT_COLOR_OPTIONS.map((option) => {
								const active = option.value === fontColor;
								return (
									<button
										key={option.id}
										type="button"
										onClick={() => setFontColor(option.value)}
										className={cn(
											"flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors",
											active
												? "border-slate-900 bg-slate-50 text-slate-950"
												: "border-slate-200 text-slate-600 hover:border-slate-400",
										)}
									>
										<span
											className="h-4 w-4 rounded-full border border-slate-300"
											style={{ backgroundColor: option.value }}
										/>
										{option.label}
									</button>
								);
							})}
						</div>
					</div>
					<div>
						<div className="mb-2 text-sm font-semibold text-slate-700">
							Background color
						</div>
						<div className="flex flex-wrap gap-2">
							{BACKGROUND_COLOR_OPTIONS.map((option) => {
								const active = option.value === backgroundColor;
								return (
									<button
										key={option.id}
										type="button"
										onClick={() => setBackgroundColor(option.value)}
										className={cn(
											"flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors",
											active
												? "border-slate-900 bg-slate-50 text-slate-950"
												: "border-slate-200 text-slate-600 hover:border-slate-400",
										)}
									>
										<span
											className="h-4 w-4 rounded-full border border-slate-300"
											style={{
												background:
													option.value === "transparent"
														? "linear-gradient(135deg, #ffffff 0%, #ffffff 45%, #e2e8f0 45%, #e2e8f0 55%, #ffffff 55%, #ffffff 100%)"
														: option.value,
											}}
										/>
										{option.label}
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
