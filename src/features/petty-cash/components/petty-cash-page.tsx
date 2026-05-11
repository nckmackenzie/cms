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
import { DeleteActionButton } from "#/components/ui/delete-action";
import { DropdownMenu, DropdownMenuItem } from "#/components/ui/dropdown-menu";
import { EmptyState } from "#/components/ui/empty";
import { Search } from "#/components/ui/search";
import { pettyCashQueries } from "#/features/petty-cash/services/queries";
import { useFilters } from "#/hooks/use-filters";
import { currencyFormatter, dateFormat } from "#/lib/helpers";
import { deletePettyCashReceipt } from "../services/petty-cash.api";

export function PettyCashPage() {
	const route = getRouteApi("/(authed)/finance/petty-cash/");
	const navigate = useNavigate({ from: "/finance/petty-cash/" });

	return (
		<BasePageComponent
			pageTitle="Petty Cash Receipts"
			pageDescription="View, manage, or add new petty cash receipts."
			hasNewButton
			buttonText="Add Petty Cash Receipt"
			newButtonAction={() => navigate({ to: "/finance/petty-cash/new" })}
			customFilters={<CustomFilters route={route} />}
		>
			<PettyCashTable route={route} />
		</BasePageComponent>
	);
}

function CustomFilters({
	route,
}: {
	route: RouteApi<"/(authed)/finance/petty-cash/">;
}) {
	const { filters, setFilters } = useFilters(route.id);

	return (
		<div className="flex flex-col md:flex-row gap-2">
			<Search
				defaultValue={filters.search}
				onHandleSearch={(value) =>
					setFilters({ search: value.trim().length > 0 ? value : undefined })
				}
				placeholder="Search petty cash receipts..."
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

function PettyCashTable({
	route,
}: {
	route: RouteApi<"/(authed)/finance/petty-cash/">;
}) {
	const { filters, setFilters } = useFilters(route.id);
	const { data } = useSuspenseQuery(pettyCashQueries.list(filters));
	const navigate = useNavigate({ from: "/finance/petty-cash/" });
	const hasFilters = !!(filters.search || filters.dateRange);

	const columns: Array<ColumnDef<(typeof data)[0]>> = [
		{
			accessorKey: "receiptNo",
			header: "Receipt No",
		},
		{
			accessorKey: "receiptDate",
			header: "Receipt Date",
			cell: ({ row }) => dateFormat(row.original.receiptDate, "long"),
		},
		{
			accessorKey: "amount",
			header: "Amount",
			cell: ({ row }) => currencyFormatter(row.original.amount),
		},
		{
			id: "bank",
			header: "Bank",
			cell: ({ row }) => {
				const bank = row.original.bank?.toUpperCase() ?? "N/A";
				return row.original.bankAccountNo
					? `${bank} - ${row.original.bankAccountNo}`
					: bank;
			},
		},
		{
			accessorKey: "reference",
			header: "Reference",
			cell: ({ row }) => row.original.reference?.toUpperCase() ?? "N/A",
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
								to="/finance/petty-cash/$pettyCashId/edit"
								params={{ pettyCashId: id }}
							>
								Edit
							</Link>
						</DropdownMenuItem>
						<DeleteActionButton
							resourceId={id}
							queryKey={["petty-cash"]}
							deleteAction={deletePettyCashReceipt}
							successMessage="Petty cash receipt deleted successfully!"
						/>
					</CustomDropdownContent>
				</DropdownMenu>
			),
		},
	];

	if (data.length === 0) {
		return (
			<EmptyState
				title={
					!hasFilters
						? "No petty cash receipts yet for current year"
						: "No petty cash receipts found matching your criteria"
				}
				description={
					!hasFilters
						? "Get started by creating your first petty cash receipt."
						: "Try adjusting your filters to find petty cash receipts."
				}
				variant={!hasFilters ? "default" : "search"}
				action={{
					label: hasFilters ? "Clear filters" : "Create Petty Cash Receipt",
					variant: hasFilters ? "outline" : "default",
					onClick: () => {
						if (hasFilters) {
							setFilters({ search: "", dateRange: undefined });
						} else {
							navigate({ to: "/finance/petty-cash/new" });
						}
					},
				}}
			/>
		);
	}

	return <DataTable data={data} columns={columns} />;
}
