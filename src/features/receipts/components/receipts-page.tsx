import { useSuspenseQuery } from "@tanstack/react-query";
import {
	getRouteApi,
	Link,
	type RouteApi,
	useNavigate,
} from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { BasePageComponent } from "#/components/ui/base-page";
import { CustomDropdownContent } from "#/components/ui/custom-dropdown-content";
import { CustomDropdownTrigger } from "#/components/ui/custom-dropdown-trigger";
import { DataTable } from "#/components/ui/datatable";
import { DatePicker } from "#/components/ui/datepicker";
import { DropdownMenu, DropdownMenuItem } from "#/components/ui/dropdown-menu";
import { Search } from "#/components/ui/search";
import { receiptQueries } from "#/features/receipts/services/queries";
import { useFilters } from "#/hooks/use-filters";
import { currencyFormatter, dateFormat } from "#/lib/helpers";

export function ReceiptsPage() {
	const route = getRouteApi("/(authed)/finance/receipts/");
	const navigate = useNavigate({ from: "/finance/receipts/" });

	return (
		<BasePageComponent
			pageTitle="Receipts"
			pageDescription="View & Manage receipts for your congregation"
			hasNewButton
			buttonText="Add Receipt"
			newButtonAction={() => navigate({ to: "/finance/receipts/new" })}
			customFilters={<CustomFilters route={route} />}
		>
			<ReceiptsDatatable route={route} />
		</BasePageComponent>
	);
}

function CustomFilters({
	route,
}: {
	route: RouteApi<"/(authed)/finance/receipts/">;
}) {
	const { filters, setFilters } = useFilters(route.id);

	return (
		<div className="flex flex-col md:flex-row gap-2">
			<Search
				defaultValue={filters.search}
				onHandleSearch={(value) =>
					setFilters({ search: value.trim().length > 0 ? value : undefined })
				}
				placeholder="Search receipts..."
				className="bg-card"
			/>
			<DatePicker
				onReset={() => setFilters({ dateRange: undefined })}
				onDateChange={(value) =>
					setFilters({
						dateRange:
							value.from && value.to
								? {
										from: dateFormat(value.from),
										to: dateFormat(value.to),
									}
								: undefined,
					})
				}
				className="bg-card"
			/>
		</div>
	);
}

function ReceiptsDatatable({
	route,
}: {
	route: RouteApi<"/(authed)/finance/receipts/">;
}) {
	const { filters } = useFilters(route.id);
	const { data } = useSuspenseQuery(receiptQueries.list(filters));
	const columns: Array<ColumnDef<(typeof data)[0]>> = [
		{
			accessorKey: "receiptNo",
			header: "Receipt No",
		},
		{
			accessorKey: "contributionDate",
			header: "Contribution Date",
			cell: ({ row }) => dateFormat(row.original.contributionDate, "long"),
		},
		{
			accessorKey: "amount",
			header: "Amount",
			cell: ({ row }) => currencyFormatter(row.original.amount),
		},
		{
			accessorKey: "reference",
			header: "Reference",
			cell: ({ row }) => row.original.reference?.toUpperCase() || "N/A",
		},
		{
			id: "actions",
			cell: ({
				row: {
					original: { id },
				},
			}) => (
				<DropdownMenu>
					<CustomDropdownTrigger />
					<CustomDropdownContent>
						<DropdownMenuItem asChild>
							<Link
								to="/finance/receipts/$receiptId/edit"
								params={{ receiptId: id }}
							>
								Edit
							</Link>
						</DropdownMenuItem>
					</CustomDropdownContent>
				</DropdownMenu>
			),
		},
	];

	return <DataTable data={data} columns={columns} />;
}
