import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

interface FilterTabsProps {
	value: string;
	onChange: (value: string) => void;
	options: Array<{ label: string; value: string }>;
	className?: string;
}

export function PillTabs({
	value,
	onChange,
	options,
	className,
}: FilterTabsProps) {
	return (
		<div
			role="tablist"
			className={cn(
				"inline-flex items-center gap-0.5 p-[3px]",
				"bg-background border border-border rounded-lg",
				className,
			)}
		>
			{options.map((opt) => {
				const active = value === opt.value;
				return (
					<Button
						key={opt.value}
						role="tab"
						aria-selected={active}
						onClick={() => onChange(opt.value)}
						variant={active ? "default" : "secondary"}
					>
						{opt.label}
					</Button>
				);
			})}
		</div>
	);
}
