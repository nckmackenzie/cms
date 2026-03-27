import { SkeletonBase } from "#/components/ui/custom-skeleton";
import { cn } from "#/lib/utils";

interface TableSkeletonProps {
	rows?: number;
	cols?: number;
	/** Custom relative width ratios per column, e.g. [2,2,1,1,1] */
	colWidths?: number[];
	hasToolbar?: boolean;
	className?: string;
	animate?: boolean;
}

export function TableSkeleton({
	rows = 5,
	cols = 4,
	colWidths,
	hasToolbar = true,
	className,
	animate,
}: TableSkeletonProps) {
	const widths = colWidths ?? Array.from({ length: cols }, () => 1);
	const total = widths.reduce((a, b) => a + b, 0) || 1;
	const pcts = widths.map((w) => `${Math.round((w / total) * 100)}%`);
	return (
		<div
			className={cn(
				"bg-card border border-border rounded-xl shadow-sm overflow-hidden",
				className,
			)}
		>
			{hasToolbar && (
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
					<SkeletonBase animate={animate} className="h-4 w-36" />
					<div className="flex gap-2">
						<SkeletonBase animate={animate} className="h-8 w-24 rounded-md" />
						<SkeletonBase animate={animate} className="h-8 w-8 rounded-md" />
					</div>
				</div>
			)}

			<div
				className="grid gap-4 px-5 py-3.5 border-b border-border"
				style={{ display: "grid", gridTemplateColumns: pcts.join(" ") }}
			>
				{pcts.map((_, i) => (
					<SkeletonBase key={i} animate={animate} className="h-3 w-[60%]" />
				))}
			</div>
			{Array.from({ length: rows }).map((_, rowIdx) => (
				<div
					key={rowIdx}
					className="px-5 py-3.5 border-b border-border last:border-0"
					style={{
						display: "grid",
						gridTemplateColumns: pcts.join(" "),
						gap: "1rem",
						opacity: Math.max(0.2, 1 - rowIdx * 0.1),
					}}
				>
					{pcts.map((_, colIdx) => (
						<div key={colIdx} className="flex flex-col gap-1.5">
							<SkeletonBase
								animate={animate}
								className="h-3"
								style={{
									width:
										colIdx === 0
											? "75%"
											: colIdx === pcts.length - 1
												? "50%"
												: "65%",
								}}
							/>
							{colIdx === 0 && (
								<SkeletonBase animate={animate} className="h-2 w-[50%]" />
							)}
						</div>
					))}
				</div>
			))}
		</div>
	);
}
