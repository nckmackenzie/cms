import { useSuspenseQuery } from "@tanstack/react-query";
import type { RouteApi } from "@tanstack/react-router";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { ChurchIcon, MapPinHouseIcon, UsersIcon } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { BasePageComponent } from "#/components/ui/base-page";
import { CustomDropdownContent } from "#/components/ui/custom-dropdown-content";
import { CustomDropdownTrigger } from "#/components/ui/custom-dropdown-trigger";
import { DataTable } from "#/components/ui/datatable";
import { DeleteActionButton } from "#/components/ui/delete-action";
import { DropdownMenu, DropdownMenuItem } from "#/components/ui/dropdown-menu";
import { PillTabs } from "#/components/ui/pill-tabs";
import { Search } from "#/components/ui/search";
import { FUND_REQUISITION_STATUS } from "#/db/schema";
import { TransactionJournal } from "#/features/coa/components/journal-view";
import { deleteFundRequisition } from "#/features/funds-requisitions/services/funds-requisition.api";
import { fundRequisitionsQueries } from "#/features/funds-requisitions/services/queries";
import { useFilters } from "#/hooks/use-filters";
import { useSheet } from "#/integrations/providers/sheet-provider";
import { currencyFormatter, dateFormat } from "#/lib/helpers";
import { toTitleCase } from "#/lib/utils";

export function FundRequisitionsPage() {
	const route = getRouteApi("/(authed)/finance/fund-requisitions/");
	const { setFilters, filters } = useFilters(route.id);
	const navigate = useNavigate({ from: "/finance/fund-requisitions/" });
	return (
		<BasePageComponent
			pageTitle="Fund Requisitions"
			pageDescription="View and manage fund requisitions"
			defaultSearchValue={filters.search}
			hasNewButton
			buttonText="New Fund Requisition"
			newButtonAction={() => navigate({ to: "/finance/fund-requisitions/new" })}
			customFilters={
				<div className="flex flex-col md:flex-row items-center gap-2">
					<Search
						defaultValue={filters.search}
						onHandleSearch={(val) =>
							setFilters({ search: val.trim().length > 0 ? val : undefined })
						}
						placeholder="Search by requisition number, requested by, or amount"
						className="bg-card"
					/>
					<PillTabs
						value={filters.status ?? "all"}
						onChange={(val) => setFilters({ status: val })}
						options={[
							{ value: "all", label: "All" },
							...FUND_REQUISITION_STATUS.map((status) => ({
								value: status,
								label: toTitleCase(status),
							})),
						]}
						className="w-full md:w-auto"
					/>
				</div>
			}
		>
			<RequisitionTable route={route} />
		</BasePageComponent>
	);
}

function RequisitionTable({
	route,
}: {
	route: RouteApi<"/(authed)/finance/fund-requisitions/">;
}) {
	const { filters } = useFilters(route.id);
	const { data } = useSuspenseQuery(fundRequisitionsQueries.list(filters));
	const { setOpen } = useSheet();

	const columns: Array<ColumnDef<(typeof data)[0]>> = [
		{
			accessorKey: "requisitionNo",
			header: "Requisition No",
		},
		{
			accessorKey: "requisitionDate",
			header: "Requisition Date",
			cell: ({ row }) => dateFormat(row.original.requisitionDate, "reporting"),
		},
		{
			accessorKey: "requestedBy",
			header: "Requested By",
			cell: ({
				row: {
					original: { requisitionType, requestedBy },
				},
			}) => {
				return (
					<div className="flex items-center gap-2">
						{requisitionType === "district" ? (
							<MapPinHouseIcon className="size-3 text-muted-foreground" />
						) : requisitionType === "group" ? (
							<UsersIcon className="size-3 text-muted-foreground" />
						) : (
							<ChurchIcon className="size-3 text-muted-foreground" />
						)}
						{requestedBy?.toUpperCase()}
					</div>
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
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => (
				<Badge
					variant={
						row.original.status === "approved"
							? "success"
							: row.original.status === "pending"
								? "warning"
								: "danger"
					}
				>
					{row.original.status.toUpperCase()}
				</Badge>
			),
		},
		{
			id: "actions",
			cell: ({
				row: {
					original: { id, status, requisitionNo, ref },
				},
			}) => {
				const canMakeChanges = status === "pending";
				return (
					<DropdownMenu>
						<CustomDropdownTrigger />
						<CustomDropdownContent>
							{canMakeChanges && (
								<>
									<DropdownMenuItem asChild>
										<Link
											to="/finance/fund-requisitions/$requestId/edit"
											params={{ requestId: id }}
										>
											Edit
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link
											to="/finance/fund-requisitions/$requestId/action"
											params={{ requestId: id }}
										>
											Approve/Reject
										</Link>
									</DropdownMenuItem>
									<DeleteActionButton
										resourceId={id}
										queryKey={["fund-requisitions"]}
										deleteAction={deleteFundRequisition}
										successMessage="Supplier deleted successfully!"
									/>
								</>
							)}
							{status === "approved" && (
								<DropdownMenuItem
									onSelect={() =>
										setOpen(
											<TransactionJournal
												source="Group Fund Approval"
												sourceId={ref.toString()}
											/>,
											{
												className: "max-w-3xl!",
												title: "Transaction Journal",
												description: `Fund Requisition #${requisitionNo}`,
											},
										)
									}
								>
									View Transaction Journal
								</DropdownMenuItem>
							)}
						</CustomDropdownContent>
					</DropdownMenu>
				);
			},
		},
	];
	return <DataTable data={data} columns={columns} />;
}
