import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import {
	ChevronRightIcon,
	ChurchIcon,
	MapPinHouseIcon,
	UsersIcon,
} from "lucide-react";
import { Badge } from "#/components/ui/badge";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { DataTable } from "#/components/ui/datatable";
import { EmptyState } from "#/components/ui/empty";
import { Skeleton } from "#/components/ui/skeleton";
import { currencyFormatter, dateFormat } from "#/lib/helpers";
import { toTitleCase } from "#/lib/utils";
import type { FinanceDashboardValidateSearch } from "../lib/schemas";
import { financeDashboardQueries } from "../services/queries";

const REQUEST_TYPE_ICON = {
	group: UsersIcon,
	district: MapPinHouseIcon,
	church: ChurchIcon,
} as const;

const REQUEST_TYPE_BADGE_VARIANT = {
	group: "info",
	district: "secondary",
	church: "outline",
} as const;

export function FinanceLatestFundRequisitions({
	filters,
}: {
	filters: FinanceDashboardValidateSearch;
}) {
	const { data } = useSuspenseQuery(
		financeDashboardQueries.latestFundRequisitions(filters),
	);
	const pendingCount = data.filter((item) => item.status === "pending").length;

	const columns: Array<ColumnDef<(typeof data)[0]>> = [
		{
			accessorKey: "requisitionNo",
			header: "Ref",
			cell: ({ row }) => (
				<span className="font-medium">#{row.original.requisitionNo}</span>
			),
		},
		{
			accessorKey: "requestedBy",
			header: "Entity",
			cell: ({ row }) => row.original.requestedBy?.toUpperCase() ?? "Unknown",
		},
		{
			accessorKey: "requisitionType",
			header: "Type",
			cell: ({ row }) => {
				const Icon = REQUEST_TYPE_ICON[row.original.requisitionType];
				return (
					<Badge
						variant={REQUEST_TYPE_BADGE_VARIANT[row.original.requisitionType]}
						className="gap-1"
					>
						<Icon className="size-3" />
						{toTitleCase(row.original.requisitionType)}
					</Badge>
				);
			},
		},
		{
			accessorKey: "amount",
			header: "Amount",
			cell: ({ row }) => (
				<span className="font-medium">
					{currencyFormatter(row.original.amount)}
				</span>
			),
		},
		{
			accessorKey: "requisitionDate",
			header: "Date",
			cell: ({ row }) => dateFormat(row.original.requisitionDate, "reporting"),
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => (
				<Badge
					variant={row.original.status === "pending" ? "warning" : "success"}
				>
					{toTitleCase(row.original.status)}
				</Badge>
			),
		},
		{
			id: "review",
			header: "",
			cell: ({ row }) => (
				<Link
					to="/finance/fund-requisitions/$requestId/action"
					params={{ requestId: row.original.id }}
					className="flex items-center gap-0.5 text-sm font-medium text-primary hover:underline"
				>
					Review
					<ChevronRightIcon className="size-3.5" />
				</Link>
			),
		},
	];

	return (
		<Card className="bg-white">
			<CardHeader>
				<CardTitle>Latest Fund Requisitions</CardTitle>
				<CardDescription>
					Group and district fund requests for the selected financial year
				</CardDescription>
				{pendingCount > 0 && (
					<CardAction>
						<Badge variant="warning">{pendingCount} pending</Badge>
					</CardAction>
				)}
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<EmptyState
						title="No fund requisitions yet"
						description="Pending and approved requisitions will appear here."
					/>
				) : (
					<DataTable
						columns={columns}
						data={data}
						withPaginationButtons={false}
						denseCell
					/>
				)}
			</CardContent>
		</Card>
	);
}

export function FinanceLatestFundRequisitionsSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-5 w-56" />
				<Skeleton className="h-4 w-72" />
			</CardHeader>
			<CardContent className="space-y-3">
				{Array.from({ length: 5 }).map((_, index) => (
					<Skeleton key={index} className="h-10 w-full" />
				))}
			</CardContent>
		</Card>
	);
}
