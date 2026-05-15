import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChurchIcon, UsersIcon } from "lucide-react";
import { BasePageComponent } from "#/components/ui/base-page";
import { Button } from "#/components/ui/button";
import { EditAction } from "#/components/ui/custom-button";
import { CustomDropdownContent } from "#/components/ui/custom-dropdown-content";
import { CustomDropdownTrigger } from "#/components/ui/custom-dropdown-trigger";
import { DataTable } from "#/components/ui/datatable";
import { DeleteActionButton } from "#/components/ui/delete-action";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { EmptyState } from "#/components/ui/empty";
import { deleteBudget } from "#/features/budgets/services/budget-accounts.api";
import { budgetQueries } from "#/features/budgets/services/queries";
import { useFilters } from "#/hooks/use-filters";
import { currencyFormatter } from "#/lib/helpers";

export function BudgetsPage() {
	const navigate = useNavigate();
	const { setFilters, filters } = useFilters(
		getRouteApi("/(authed)/finance/budgets/").id,
	);
	const handleNavigate = (type: "church" | "group") => {
		navigate({ to: "/finance/budgets/new", search: { type } });
	};
	return (
		<BasePageComponent
			pageTitle="Budgets"
			pageDescription="Manage budgets"
			searchPlaceholder="Search budget..."
			defaultSearchValue={filters?.search ?? ""}
			onSearch={(val) => setFilters({ search: val })}
			extraActionButtons={
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button size="xl">
							Create New Budget
							<ChevronDown />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem
							className="flex items-center gap-2"
							onClick={() => handleNavigate("church")}
						>
							<ChurchIcon className="size-4" /> New Church Budget
						</DropdownMenuItem>
						<DropdownMenuItem
							className="flex items-center gap-2"
							onClick={() => handleNavigate("group")}
						>
							<UsersIcon className="size-4" /> New Group Budget
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			}
		>
			<BudgetTable />
		</BasePageComponent>
	);
}

function BudgetTable() {
	const route = getRouteApi("/(authed)/finance/budgets/");
	const navigate = useNavigate();
	const query = useFilters(route.id);
	const { data } = useSuspenseQuery(
		budgetQueries.list({
			search: query.filters?.search ?? "",
		}),
	);
	const hasFilters = Boolean(query.filters?.search);

	const columns: Array<ColumnDef<(typeof data)[0]>> = [
		{
			accessorKey: "year",
			header: "Year",
		},
		{
			id: "costCenter",
			header: "Cost Center",
			cell: ({ row }) => {
				const costCenter =
					row.original.type === "church" ? "Church" : row.original.groupName;
				return <div className="uppercase">{costCenter}</div>;
			},
		},
		{
			accessorKey: "amount",
			header: "Amount",
			cell: ({ row }) => currencyFormatter(row.original.amount),
		},
		{
			id: "actions",
			cell: ({
				row: {
					original: { publicId },
				},
			}) => (
				<DropdownMenu>
					<CustomDropdownTrigger />
					<CustomDropdownContent>
						<DropdownMenuItem asChild>
							<Link
								to="/finance/budgets/$budgetId/edit"
								params={{ budgetId: publicId }}
							>
								<EditAction />
							</Link>
						</DropdownMenuItem>
						<DeleteActionButton
							queryKey={["budgets"]}
							resourceId={publicId}
							deleteAction={async () => deleteBudget({ data: publicId })}
						/>
					</CustomDropdownContent>
				</DropdownMenu>
			),
		},
	];

	if (data.length === 0) {
		return (
			<EmptyState
				title={hasFilters ? "No results found" : "No budgets created"}
				description={
					hasFilters
						? "Try adjusting your search"
						: "Get started by creating a new budget"
				}
				variant={!hasFilters ? "default" : "search"}
				action={{
					label: hasFilters ? "Clear filters" : "Create Expense",
					variant: hasFilters ? "outline" : "default",
					onClick: () => {
						if (hasFilters) {
							query.setFilters({ search: "" });
						} else {
							navigate({
								to: "/finance/budgets/new",
								search: { type: "church" },
							});
						}
					},
				}}
			/>
		);
	}

	return <DataTable data={data} columns={columns} />;
}
