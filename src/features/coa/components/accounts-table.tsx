import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import {
	type ColumnDef,
	type ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { EditAction } from "@/components/ui/custom-button";
import { DatatableActions } from "@/components/ui/datatable-actions";
import { DeleteActionButton } from "@/components/ui/delete-action";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { PermissionGate } from "@/components/ui/permission-gate";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useFilters } from "@/hooks/use-filters";
import { toTitleCase } from "@/lib/utils";
import { type AccountType, deleteAccount } from "../services/coa.api";
import { accountQueries } from "../services/queries";

export type LedgerAccount = {
	id: number;
	name: string;
	parentId: number | null;
	accountType: AccountType;
	normalBalance: "debit" | "credit";
	isPosting: boolean;
	// balance: string;
	// rolledBalance: string;
	children?: LedgerAccount[];
};

export function buildAccountTree(accounts: LedgerAccount[]): LedgerAccount[] {
	const accountMap = new Map<number, LedgerAccount>();
	const rootAccounts: LedgerAccount[] = [];

	accounts.forEach((account) => {
		accountMap.set(account.id, { ...account, children: [] });
	});

	accounts.forEach((account) => {
		// biome-ignore lint/style/noNonNullAssertion: <>
		const node = accountMap.get(account.id)!;

		if (account.parentId) {
			const parent = accountMap.get(account.parentId);
			if (parent) {
				parent.children?.push(node);
			} else {
				// Handle orphan records or root if parent not found
				rootAccounts.push(node);
			}
		} else {
			rootAccounts.push(node);
		}
	});

	return rootAccounts;
}

export const ChartOfAccountsTable = () => {
	const { filters } = useFilters(
		getRouteApi("/(authed)/finance/chart-of-accounts").id,
	);
	const { data: rawData } = useSuspenseQuery(accountQueries.list(filters));
	// const { data } = useSuspenseQuery(accountQueries.listWithBalances(filters));
	const data = useMemo(() => buildAccountTree(rawData), [rawData]);
	const navigate = useNavigate({ from: "/finance/chart-of-accounts" });

	const [expanded, setExpanded] = useState<ExpandedState>({});
	const columns = useMemo<ColumnDef<LedgerAccount>[]>(
		() => [
			{
				accessorKey: "name",
				header: "Account Name",
				cell: ({ row, getValue }) => (
					<div
						style={{
							// Indent based on depth: 0px, 20px, 40px, etc.
							paddingLeft: `${row.depth * 2}rem`,
						}}
						className="flex items-center gap-2"
					>
						{/* The Expander Button */}
						{row.getCanExpand() ? (
							<button
								onClick={row.getToggleExpandedHandler()}
								style={{ cursor: "pointer" }}
								type="button"
							>
								{/* {row.getIsExpanded() ? "▼" : "▶"} */}
								{row.getIsExpanded() ? "-" : "+"}
							</button>
						) : (
							// Spacer for non-expandable rows to align text
							<span className="w-4 inline-block" />
						)}
						{getValue<string>()}
					</div>
				),
			},
			{
				accessorKey: "accountType",
				header: "Type",
				cell: ({ row }) => toTitleCase(row.original.accountType),
			},
			{
				id: "actions",
				cell: ({
					row: {
						original: { id },
					},
				}) => (
					<DatatableActions>
						<PermissionGate hasAccess>
							<DropdownMenuItem
								onClick={() =>
									navigate({ search: { accountId: id, sheet: "edit" } })
								}
							>
								<EditAction />
							</DropdownMenuItem>
						</PermissionGate>
						<PermissionGate hasAccess>
							<DeleteActionButton
								deleteAction={deleteAccount}
								resourceId={id.toString()}
								queryKey={["accounts"]}
							/>
						</PermissionGate>
					</DatatableActions>
				),
			},
		],
		[navigate],
	);

	const table = useReactTable({
		data,
		columns,
		state: {
			expanded,
		},
		onExpandedChange: setExpanded,
		getSubRows: (row) => row.children,
		getCoreRowModel: getCoreRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
	});
	return (
		<div className="rounded-md border border-border overflow-x-auto bg-card">
			<Table className="w-full text-left border-collapse">
				<TableHeader className="bg-secondary">
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow
							key={headerGroup.id}
							className="border-b border-b-border bg-gray-50"
						>
							{headerGroup.headers.map((header) => (
								<TableHead
									key={header.id}
									className="p-2 font-semibold text-sm text-gray-600"
								>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.map((row) => (
						<TableRow
							key={row.id}
							className="border-b border-b-border hover:bg-gray-50"
						>
							{row.getVisibleCells().map((cell) => (
								<TableCell key={cell.id} className="p-2">
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
};
