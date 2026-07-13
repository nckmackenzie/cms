import { useSuspenseQuery } from "@tanstack/react-query";
import { ChurchIcon, MapPinHouseIcon, UsersIcon } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { EmptyState } from "#/components/ui/empty";
import { Skeleton } from "#/components/ui/skeleton";
import { currencyFormatter } from "#/lib/helpers";
import { cn } from "#/lib/utils";
import type { FinanceDashboardValidateSearch } from "../lib/schemas";
import { financeDashboardQueries } from "../services/queries";

const REQUEST_TYPE_ICON = {
	group: UsersIcon,
	district: MapPinHouseIcon,
	church: ChurchIcon,
} as const;

export function FinanceExpenseAccountability({
	filters,
}: {
	filters: FinanceDashboardValidateSearch;
}) {
	const { data } = useSuspenseQuery(
		financeDashboardQueries.expenseAccountability(filters),
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Expense Accountability</CardTitle>
				<CardDescription>
					Top 5 group/district requisitions whose approved funds aren't fully
					accounted for, for the selected financial year
				</CardDescription>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<EmptyState
						title="All requisitions accounted for"
						description="Every approved group and district requisition has matching expenses recorded against it."
					/>
				) : (
					<ul className="space-y-3">
						{data.map((item) => {
							const Icon = REQUEST_TYPE_ICON[item.requisitionType];
							const isOverAccounted = item.variance < 0;
							return (
								<li
									key={item.id}
									className="space-y-2 rounded-md border border-border bg-muted/40 p-3"
								>
									<div className="flex items-center justify-between gap-4">
										<div className="flex min-w-0 items-center gap-1.5">
											<Icon className="size-3.5 shrink-0 text-muted-foreground" />
											<p className="truncate text-sm font-medium">
												{item.requestedBy?.toUpperCase() ?? "Unknown"}
											</p>
										</div>
										<span
											className={cn(
												"shrink-0 text-xs font-semibold",
												isOverAccounted
													? "text-red-600 dark:text-red-400"
													: "text-amber-600 dark:text-amber-400",
											)}
										>
											{isOverAccounted
												? `Over-accounted by ${currencyFormatter(Math.abs(item.variance))}`
												: `${currencyFormatter(item.variance)} outstanding`}
										</span>
									</div>
									<p className="truncate text-xs text-muted-foreground">
										{item.purpose}
									</p>
									<p className="text-xs text-muted-foreground">
										{currencyFormatter(item.accountedAmount)} accounted of{" "}
										{currencyFormatter(item.approvedAmount)} approved
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

export function FinanceExpenseAccountabilitySkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-5 w-56" />
				<Skeleton className="h-4 w-80" />
			</CardHeader>
			<CardContent className="space-y-3">
				{Array.from({ length: 5 }).map((_, index) => (
					<Skeleton key={index} className="h-16 w-full" />
				))}
			</CardContent>
		</Card>
	);
}
