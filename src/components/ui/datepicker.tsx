import { format, isEqual, startOfDay, subDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/re-ui-btn";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type FinancialYearRange = {
	currentYear: { from: Date; to: Date };
	previousYear: { from: Date; to: Date };
};

export function getFinancialYearRanges(date?: Date): FinancialYearRange {
	const ref = date ?? new Date();
	const year = ref.getFullYear();
	const month = ref.getMonth(); // 0-indexed: Oct = 9

	const fyStartYear = month >= 9 ? year : year - 1;

	const currentYearFrom = new Date(fyStartYear, 9, 1);
	const currentYearTo = ref;

	const previousYearFrom = new Date(fyStartYear - 1, 9, 1);
	const previousYearTo = new Date(fyStartYear, 8, 30);

	return {
		currentYear: { from: currentYearFrom, to: currentYearTo },
		previousYear: { from: previousYearFrom, to: previousYearTo },
	};
}

type DateRangePickerProps = {
	initialDateRange?: DateRange;
	onDateChange?: (dateRange: DateRange) => void;
	onReset?: () => void;
	className?: string;
	disabled?: boolean;
};

export function DatePicker({
	onDateChange,
	initialDateRange,
	onReset,
	className,
	disabled,
}: DateRangePickerProps) {
	const today = useMemo(() => new Date(), []);
	const presets = useMemo(
		() => [
			{ label: "Today", range: { from: today, to: today } },
			{
				label: "Yesterday",
				range: { from: subDays(today, 1), to: subDays(today, 1) },
			},
			{ label: "Last 7 days", range: { from: subDays(today, 6), to: today } },
			{ label: "Last 30 days", range: { from: subDays(today, 29), to: today } },
			{
				label: "Year to date",
				range: getFinancialYearRanges(today).currentYear,
			},
			{
				label: "Previous year",
				range: getFinancialYearRanges(today).previousYear,
			},
		],
		[today],
	);

	const [month, setMonth] = useState(today);
	const defaultPreset = presets[2];
	const [date, setDate] = useState<DateRange | undefined>(
		initialDateRange || defaultPreset.range,
	); // Default: Last 7 days
	const [selectedPreset, setSelectedPreset] = useState<string | null>(
		defaultPreset.label,
	);

	const [isPopoverOpen, setIsPopoverOpen] = useState(false);
	const isMobile = useIsMobile();

	useEffect(() => {
		setDate(initialDateRange || undefined);
	}, [initialDateRange]);

	const handleApply = () => {
		if (date) {
			setDate(date);
			onDateChange?.(date);
		}

		setIsPopoverOpen(false);
	};

	const handleReset = () => {
		setDate(undefined);
		setSelectedPreset(null);
		setIsPopoverOpen(false);
		onReset?.();
	};

	const handleSelect = (selected: DateRange | undefined) => {
		setDate({
			from: selected?.from || undefined,
			to: selected?.to || undefined,
		});
		setSelectedPreset(null); // Clear preset when manually selecting a range
	};

	// Update `selectedPreset` whenever `date` changes
	useEffect(() => {
		const matchedPreset = presets.find(
			(preset) =>
				isEqual(
					startOfDay(preset.range.from),
					startOfDay(date?.from || new Date(0)),
				) &&
				isEqual(
					startOfDay(preset.range.to),
					startOfDay(date?.to || new Date(0)),
				),
		);
		setSelectedPreset(matchedPreset?.label || null);
	}, [date, presets]);
	return (
		<Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					mode="input"
					placeholder={!date?.from && !date?.to}
					className={cn("w-full md:max-w-lg", className)}
					size="lg"
					disabled={disabled}
				>
					<CalendarIcon />
					{date?.from ? (
						date.to ? (
							<>
								{format(date.from, "LLL dd, y")} -{" "}
								{format(date.to, "LLL dd, y")}
							</>
						) : (
							format(date.from, "LLL dd, y")
						)
					) : (
						<span>Pick a date range</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="center">
				<div className="flex max-sm:flex-col">
					<div className="relative border-border max-sm:order-1 max-sm:border-t sm:w-32">
						{isMobile ? (
							<div className="p-2">
								<Select
									value={selectedPreset || undefined}
									onValueChange={(val) => {
										const label = val || "";
										const preset =
											presets.find((p) => p.label === label) || null;
										if (preset) {
											setDate(preset.range);
											setMonth(preset.range.from || today);
											setSelectedPreset(preset.label);
										} else {
											setSelectedPreset(null);
										}
									}}
								>
									<SelectTrigger size="sm" className="w-full">
										<SelectValue placeholder="Presets" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{presets.map((preset) => (
												<SelectItem key={preset.label} value={preset.label}>
													{preset.label}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
						) : (
							// Desktop: button list
							<div className="h-full border-border sm:border-e py-2">
								<div className="flex flex-col px-2 gap-0.5">
									{presets.map((preset) => (
										<Button
											key={preset.label}
											type="button"
											variant="ghost"
											className={cn(
												"h-8 w-full justify-start text-foreground",
												selectedPreset === preset.label && "bg-accent",
											)}
											onClick={() => {
												setDate(preset.range);

												// Update the calendar to show the starting month of the selected range
												setMonth(preset.range.from || today);

												setSelectedPreset(preset.label); // Explicitly set the active preset
											}}
										>
											{preset.label}
										</Button>
									))}{" "}
								</div>
							</div>
						)}
					</div>
					<Calendar
						autoFocus
						mode="range"
						month={month}
						onMonthChange={setMonth}
						showOutsideDays={false}
						selected={date}
						onSelect={handleSelect}
						numberOfMonths={2}
					/>
				</div>
				<div className="flex items-center justify-end gap-1.5 border-t border-border p-3">
					<Button variant="outline" onClick={handleReset}>
						Reset
					</Button>
					<Button onClick={handleApply}>Apply</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
