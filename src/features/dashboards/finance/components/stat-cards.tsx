import { useSuspenseQuery } from "@tanstack/react-query";
import {
	BadgeCheck,
	HandCoins,
	HandshakeIcon,
	LandmarkIcon,
	type LucideIcon,
	Wallet2Icon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "#/components/ui/skeleton";
import { currencyFormatter } from "#/lib/helpers";
import { cn } from "#/lib/utils";
import type { FinanceDashboardValidateSearch } from "../lib/schemas";
import { financeDashboardQueries } from "../services/queries";

export function FinanceStatCards({
	filters,
}: {
	filters: FinanceDashboardValidateSearch;
}) {
	const { data: stats } = useSuspenseQuery(
		financeDashboardQueries.statCards(filters),
	);
	return (
		<section className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
			<StatCard
				title={"Total Receipts"}
				Icon={HandCoins}
				value={currencyFormatter(stats.receiptsTotal)}
				iconBgColor="bg-success"
				iconColor="text-success-foreground"
			/>
			<StatCard
				title={"Total Expenses"}
				Icon={Wallet2Icon}
				value={currencyFormatter(stats.expenseSummary.totalApprovedExpenses)}
				iconBgColor="bg-danger"
				iconColor="text-danger-foreground"
				description={
					stats.expenseSummary.unApprovedExpenses > 0 ? (
						<p className="text-amber-800 flex items-center gap-1 text-xs">
							{stats.expenseSummary.unApprovedExpenses}{" "}
							{stats.expenseSummary.unApprovedExpenses !== 1
								? "expenses"
								: "expense"}{" "}
							pending approval
						</p>
					) : (
						<div className="text-emerald-800 flex items-center gap-1 text-xs">
							<BadgeCheck className="size-3" /> All expenses approved
						</div>
					)
				}
			/>
			<StatCard
				title={"Total Funds Disbursed"}
				Icon={HandshakeIcon}
				value={currencyFormatter(
					stats.fundRequisitionSummary.totalFundRequisitionsApproved,
				)}
				iconBgColor="bg-info"
				iconColor="text-info-foreground"
				description={
					stats.fundRequisitionSummary.unApprovedFundRequisitions > 0 ? (
						<p className="text-amber-800 flex items-center gap-1 text-xs">
							{stats.fundRequisitionSummary.unApprovedFundRequisitions}{" "}
							{stats.fundRequisitionSummary.unApprovedFundRequisitions !== 1
								? "requests"
								: "request"}{" "}
							pending approval
						</p>
					) : (
						<div className="text-emerald-800 flex items-center gap-1 text-xs">
							<BadgeCheck className="size-3" /> All requisitions approved
						</div>
					)
				}
			/>
			<StatCard
				title={"Uncleared Transactions"}
				Icon={LandmarkIcon}
				value={`${stats.unclearedTransactions.unclearedTransactionsCount} ${
					stats.unclearedTransactions.unclearedTransactionsCount === 1
						? "Transaction"
						: "Transactions"
				}`}
				iconBgColor="bg-warning"
				iconColor="text-warning-foreground"
				description={
					stats.unclearedTransactions.unclearedTransactionsCount > 0 ? (
						<p className="text-amber-800 flex items-center gap-1 text-xs">
							{currencyFormatter(
								stats.unclearedTransactions.totalUnclearedTransactions,
							)}{" "}
							uncleared
						</p>
					) : (
						<div className="text-emerald-800 flex items-center gap-1 text-xs">
							<BadgeCheck className="size-3" /> All transactions cleared
						</div>
					)
				}
			/>
		</section>
	);
}

export function FinanceStatCardsSkeleton() {
	return (
		<section className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
			<StatCardSkeleton />
			<StatCardSkeleton />
			<StatCardSkeleton />
			<StatCardSkeleton />
		</section>
	);
}

type StatCardProps = {
	title: string;
	description?: string | ReactNode;
	Icon: LucideIcon;
	value: string;
	iconBgColor?: string;
	iconColor?: string;
};

function StatCard({
	title,
	description,
	Icon,
	value,
	iconBgColor,
	iconColor,
}: StatCardProps) {
	return (
		<article className="bg-white rounded-md p-4 shadow border border-border space-y-2">
			<header className="flex items-center justify-between">
				<div
					className={cn(
						"size-8 rounded-full bg-muted flex items-center justify-center",
						iconBgColor,
						iconColor,
					)}
				>
					<Icon className="size-4" />
				</div>
				{description && typeof description === "string" && (
					<p className="text-xs text-muted-foreground">{description}</p>
				)}
				{description && typeof description !== "string" && description}
			</header>
			<div className="space-y-1">
				<h2 className="text-lg font-semibold tracking-tight">{value}</h2>
				<p className="text-muted-foreground text-xs font-medium">{title}</p>
			</div>
		</article>
	);
}

function StatCardSkeleton() {
	return (
		<article className="bg-background rounded-md p-4 shadow border border-border space-y-2">
			<header className="flex items-center justify-between">
				<Skeleton className="size-8 rounded-full" />
				<Skeleton className="h-3 w-24" />
			</header>
			<div className="space-y-1">
				<Skeleton className="h-7 w-56" />
				<Skeleton className="h-4 w-28" />
			</div>
		</article>
	);
}
