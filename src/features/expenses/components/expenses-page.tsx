import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import type { z } from "zod";
import { ActionButton } from "#/components/ui/action-button";
import { Badge } from "#/components/ui/badge";
import { BasePageComponent } from "#/components/ui/base-page";
import { EditAction } from "#/components/ui/custom-button";
import { CustomDropdownContent } from "#/components/ui/custom-dropdown-content";
import { CustomDropdownTrigger } from "#/components/ui/custom-dropdown-trigger";
import { DataTable } from "#/components/ui/datatable";
import { DeleteActionButton } from "#/components/ui/delete-action";
import { DropdownMenu, DropdownMenuItem } from "#/components/ui/dropdown-menu";
import { EmptyState } from "#/components/ui/empty";
import { Search } from "#/components/ui/search";
import { CustomSelect } from "#/components/ui/select";
import { FUND_REQUISITION_STATUS } from "#/db/schema";
import { TransactionJournal } from "#/features/coa/components/journal-view";
import {
	approveExpense,
	deleteExpense,
	unapproveExpense,
} from "#/features/expenses/services/expenses.api";
import { expenseQueries } from "#/features/expenses/services/query";
import type { expensesPageValidateSearch } from "#/features/expenses/utils/schemas";
import { useFilters } from "#/hooks/use-filters";
import { useSheet } from "#/integrations/providers/sheet-provider";
import { currencyFormatter, dateFormat } from "#/lib/helpers";
import { toTitleCase } from "#/lib/utils";

type Filters = z.infer<typeof expensesPageValidateSearch>;

type Props = {
	filters: Filters;
	setFilters: (filters: Filters) => void;
};

export function ExpensesPage() {
	const route = getRouteApi("/(authed)/finance/expenses/");
	const { filters, setFilters } = useFilters(route.id);
	const { years } = route.useLoaderData();
	const navigate = useNavigate({ from: "/finance/expenses/" });
	return (
		<BasePageComponent
			pageTitle="Expenses"
			pageDescription="View, filter, and manage expenses, or create a new one."
			buttonText="Add New Expense"
			hasNewButton
			newButtonAction={() => navigate({ to: "/finance/expenses/new" })}
			customFilters={
				<CustomFilters
					filters={filters}
					setFilters={setFilters}
					years={years.map((year) => ({
						value: year.publicId,
						label: year.yearName.toUpperCase(),
					}))}
				/>
			}
		>
			<ExpensesTable filters={filters} setFilters={setFilters} />
		</BasePageComponent>
	);
}

function CustomFilters({
	filters,
	setFilters,
	years,
}: Props & { years: Array<{ value: string; label: string }> }) {
	return (
		<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
			<Search
				placeholder="Search expenses..."
				onHandleSearch={(val) => setFilters({ search: val })}
				className="bg-card"
				parentClassName="md:col-span-full lg:col-span-2 max-w-full!"
			/>
			<CustomSelect
				onChange={(val) => setFilters({ year: val })}
				value={filters.year ?? years[0].value}
				options={years}
				placeholder="Financial year..."
			/>
			<CustomSelect
				onChange={(val) => setFilters({ status: val as Filters["status"] })}
				value={filters.status ?? "all"}
				options={[
					{ value: "all", label: "All" },
					...FUND_REQUISITION_STATUS.map((status) => ({
						value: status,
						label: toTitleCase(status),
					})),
				]}
				placeholder="Expense status..."
			/>
		</div>
	);
}

function ExpensesTable({ filters, setFilters }: Props) {
	const { data: expenses } = useSuspenseQuery(expenseQueries.list(filters));
	const queryClient = useQueryClient();
	const hasFilters = !!(
		filters.search ||
		filters.status ||
		filters.status !== "all" ||
		filters.year
	);

	const { setOpen } = useSheet();

	function handleSuccess() {
		queryClient.invalidateQueries({ queryKey: ["expenses"] });
	}

	const columns: Array<ColumnDef<(typeof expenses)[0]>> = [
		{
			accessorKey: "expenseDate",
			header: "Date",
			cell: ({ row }) => dateFormat(row.original.expenseDate, "reporting"),
		},
		{
			accessorKey: "voucherNo",
			header: "Voucher No",
		},
		{
			accessorKey: "expenseType",
			header: "Expense Type",
			cell: ({ row }) => toTitleCase(row.original.expenseType),
		},
		{
			accessorKey: "costCenter",
			header: "Cost Center",
			cell: ({ row }) => row.original.costCenter?.toUpperCase(),
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({
				row: {
					original: { status },
				},
			}) => (
				<Badge
					variant={
						status === "approved"
							? "success"
							: status === "pending"
								? "warning"
								: "outline"
					}
				>
					{status.toUpperCase()}
				</Badge>
			),
		},
		{
			accessorKey: "amount",
			header: "Amount",
			cell: ({
				row: {
					original: { amount },
				},
			}) => <Badge variant="outline">{currencyFormatter(amount)}</Badge>,
		},
		{
			id: "action",
			cell: ({
				row: {
					original: { id, status, voucherNo, ref },
				},
			}) => (
				<DropdownMenu>
					<CustomDropdownTrigger />
					<CustomDropdownContent className="w-fit!">
						{status === "pending" && (
							<>
								<DropdownMenuItem asChild>
									<Link
										to="/finance/expenses/$expenseId/edit"
										params={{ expenseId: id }}
									>
										<EditAction />
									</Link>
								</DropdownMenuItem>
								<ActionButton
									className="px-1.5 py-1.5 justify-start h-auto w-full flex focus:outline-0"
									requireAreYouSure
									variant="ghost"
									isDestructive={false}
									action={() => approveExpense({ data: id })}
									onSuccess={handleSuccess}
								>
									Approve
								</ActionButton>
								<DeleteActionButton
									deleteAction={async () => deleteExpense({ data: id })}
									queryKey={["expenses"]}
									resourceId={id}
								/>
							</>
						)}
						{status === "approved" && (
							<>
								<DropdownMenuItem
									onSelect={() =>
										setOpen(
											<TransactionJournal
												source="Expenses"
												sourceId={ref.toString()}
											/>,
											{
												className: "max-w-3xl!",
												title: "Transaction Journal",
												description: `Expense #${voucherNo}`,
											},
										)
									}
								>
									View Transaction Journal
								</DropdownMenuItem>
								<ActionButton
									className="px-1.5 py-1.5 text-destructive transition-colors hover:bg-destructive/20! hover:text-destructive-foreground justify-start h-auto w-full flex focus:outline-0"
									requireAreYouSure
									variant="ghost"
									isDestructive={true}
									action={() => unapproveExpense({ data: id })}
									onSuccess={handleSuccess}
								>
									Unapprove
								</ActionButton>
							</>
						)}
					</CustomDropdownContent>
				</DropdownMenu>
			),
		},
	];

	if (expenses.length === 0) {
		return (
			<EmptyState
				title={
					!hasFilters
						? "No expenses yet for current year"
						: "No expenses found matching your criteria"
				}
				description={
					!hasFilters
						? "Get started by creating your first expense."
						: "Try adjusting your filters to find expenses."
				}
				variant={!hasFilters ? "default" : "search"}
				action={{
					label: hasFilters ? "Clear filters" : "Create Expense",
					variant: hasFilters ? "outline" : "default",
					onClick: () => {
						if (hasFilters) {
							setFilters({ search: "", status: "all", year: undefined });
						}
					},
				}}
			/>
		);
	}

	return <DataTable data={expenses} columns={columns} />;
}
