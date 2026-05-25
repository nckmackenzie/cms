import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable } from "#/components/ui/datatable";
import { DatePicker } from "#/components/ui/datepicker";
import { Search } from "#/components/ui/search";
import { Spinner } from "#/components/ui/spinner";
import type {
	JournalSearchInput,
	JournalSearchResult,
} from "#/features/journal-entries/services/journal-entries.api";
import { journalQueries } from "#/features/journal-entries/services/queries";
import { useFilters } from "#/hooks/use-filters";
import { useSheet } from "#/integrations/providers/sheet-provider";
import { currencyFormatter, dateFormat } from "#/lib/helpers";

const emptySearchFilters: JournalSearchInput = {
	dateRange: {
		from: "1970-01-01",
		to: "1970-01-01",
	},
};

export function JournalSearch() {
	const route = getRouteApi("/(authed)/finance/journal-entries/");
	const { setFilters } = useFilters(route.id);
	const { setClose } = useSheet();
	const [dateRange, setDateRange] = useState<JournalSearchInput["dateRange"]>();
	const [tableSearch, setTableSearch] = useState("");
	const filters = dateRange ? { dateRange } : emptySearchFilters;
	const hasDateRange = !!dateRange;

	const { data = [], isFetching } = useQuery({
		...journalQueries.search(filters),
		enabled: hasDateRange,
	});

	const filteredData = useMemo(() => {
		const normalizedSearch = tableSearch.trim().toLowerCase();
		if (!normalizedSearch) return data;

		return data.filter((entry) =>
			[
				entry.journalNo.toString(),
				dateFormat(entry.transactionDate, "long"),
				currencyFormatter(entry.amount),
			]
				.join(" ")
				.toLowerCase()
				.includes(normalizedSearch),
		);
	}, [data, tableSearch]);

	const columns = useMemo<Array<ColumnDef<JournalSearchResult>>>(
		() => [
			{
				accessorKey: "transactionDate",
				header: "Transaction Date",
				cell: ({ row }) => dateFormat(row.original.transactionDate, "long"),
			},
			{
				accessorKey: "journalNo",
				header: "Journal No",
			},
			{
				accessorKey: "amount",
				header: "Amount",
				cell: ({ row }) => currencyFormatter(row.original.amount),
			},
		],
		[],
	);

	function handleSelectJournal(entry: JournalSearchResult) {
		setFilters({ public_id: entry.publicId });
		setClose();
	}

	return (
		<div className="space-y-5">
			<header className="space-y-1">
				<h2 className="text-xl font-semibold tracking-tight">
					Search journal entries
				</h2>
				<p className="text-sm text-muted-foreground">
					Find a journal entry by transaction date, then select a row to load it
					for review or editing.
				</p>
			</header>

			<div className="space-y-3">
				<DatePicker
					className="bg-card md:max-w-none"
					onReset={() => {
						setDateRange(undefined);
						setTableSearch("");
					}}
					onDateChange={(value) =>
						setDateRange(
							value.from && value.to
								? {
										from: dateFormat(value.from),
										to: dateFormat(value.to),
									}
								: undefined,
						)
					}
				/>

				{hasDateRange && (
					<Search
						defaultValue={tableSearch}
						onHandleSearch={setTableSearch}
						placeholder="Search results..."
						className="bg-card"
						parentClassName="md:max-w-none"
					/>
				)}
			</div>

			{!hasDateRange ? (
				<div className="flex min-h-[220px] flex-col items-center justify-center rounded-md border border-dashed bg-card/60 p-6 text-center">
					<div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
						<SearchIcon className="size-5 text-muted-foreground" />
					</div>
					<p className="font-medium">Choose a date range to begin</p>
					<p className="mt-1 max-w-sm text-sm text-muted-foreground">
						Search results are pulled from journal entry headers within the
						selected transaction date range.
					</p>
				</div>
			) : isFetching ? (
				<div className="flex min-h-[220px] items-center justify-center rounded-md border bg-card">
					<Spinner className="size-5" />
				</div>
			) : (
				<DataTable
					data={filteredData}
					columns={columns}
					denseCell
					onRowClick={handleSelectJournal}
				/>
			)}
		</div>
	);
}
