import { useSuspenseQuery } from "@tanstack/react-query";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { EmptyState } from "#/components/ui/empty";
import { Progress } from "#/components/ui/progress";
import { Skeleton } from "#/components/ui/skeleton";
import { currencyFormatter } from "#/lib/helpers";
import { cn } from "#/lib/utils";
import {
	type BudgetProgressVariant,
	getBudgetProgressVariant,
	getProgressBarValue,
} from "../lib/helpers";
import type { FinanceDashboardValidateSearch } from "../lib/schemas";
import { financeDashboardQueries } from "../services/queries";

const VARIANT_CLASSES: Record<
	BudgetProgressVariant,
	{ bar: string; text: string }
> = {
	danger: { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" },
	warning: {
		bar: "bg-amber-500",
		text: "text-amber-600 dark:text-amber-400",
	},
	success: {
		bar: "bg-emerald-500",
		text: "text-emerald-600 dark:text-emerald-400",
	},
};

export function FinanceBudgetVsActual({
	filters,
}: {
	filters: FinanceDashboardValidateSearch;
}) {
	const { data } = useSuspenseQuery(
		financeDashboardQueries.budgetVsActual(filters),
	);

	return (
		<Card className="bg-white self-start">
			<CardHeader>
				<CardTitle>Budget vs Actual</CardTitle>
				<CardDescription>
					Top 5 church expense voteheads by percentage of budget spent, for the
					selected financial year
				</CardDescription>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<EmptyState
						title="No church budget set"
						description="Set up a church budget to track actual spend against it."
					/>
				) : (
					<ul className="space-y-4">
						{data.map((line) => {
							const variant = getBudgetProgressVariant(line.percentageSpent);
							const classes = VARIANT_CLASSES[variant];
							return (
								<li key={line.id} className="space-y-1.5">
									<div className="flex items-center justify-between gap-2 text-sm">
										<span className="font-medium">{line.name}</span>
										<span className={cn("font-semibold", classes.text)}>
											{Math.round(line.percentageSpent)}%
										</span>
									</div>
									<Progress
										value={getProgressBarValue(line.percentageSpent)}
										indicatorClassName={classes.bar}
										aria-label={`${line.name} budget usage`}
									/>
									<p className="text-xs text-muted-foreground">
										{currencyFormatter(line.actualAmount)} of{" "}
										{currencyFormatter(line.budgetAmount)}
									</p>
								</li>
							);
						})}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

export function FinanceBudgetVsActualSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-5 w-48" />
				<Skeleton className="h-4 w-80" />
			</CardHeader>
			<CardContent className="space-y-4">
				{Array.from({ length: 5 }).map((_, index) => (
					<div key={index} className="space-y-1.5">
						<div className="flex items-center justify-between">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-10" />
						</div>
						<Skeleton className="h-1 w-full" />
					</div>
				))}
			</CardContent>
		</Card>
	);
}
