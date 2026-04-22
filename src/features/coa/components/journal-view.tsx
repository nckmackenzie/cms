import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BookOpen } from "lucide-react";
import { SkeletonBase } from "#/components/ui/custom-skeleton";
import { EmptyState } from "#/components/ui/empty";
import { RouteErrorComponent } from "#/components/ui/route-components";
import {
	type AccountType,
	getTransactionJournal,
} from "#/features/coa/services/coa.api";
import type { Source } from "#/lib/constants";
import { currencyFormatter, dateFormat, toNumber } from "#/lib/helpers";
import { cn } from "@/lib/utils";

export interface JournalEntry {
	id: string;
	accountType: AccountType;
	accountName: string;
	debit: number;
	credit: number;
	narration?: string;
}

export interface JournalData {
	date: string;
	entries: JournalEntry[];
}

export interface TransactionJournalProps {
	source: Source;
	sourceId: string;
	className?: string;
}

export const journalKeys = {
	all: () => ["journal"] as const,
	bySource: (source: string, id: string) => ["journal", source, id] as const,
};

const TYPE_COLOR: Record<string, string> = {
	Asset: "text-[oklch(0.38_0.14_266)]",
	Liability: "text-warning-foreground",
	Income: "text-success-foreground",
	Expense: "text-danger-foreground",
	Equity: "text-primary",
};

function JournalSkeleton() {
	return (
		<div className="flex flex-col gap-4 animate-in fade-in duration-300">
			<div className="grid grid-cols-[1.6fr_2.4fr_1fr_1fr] gap-3 px-1">
				{["w-10", "w-20", "w-12", "w-12"].map((w, i) => (
					<SkeletonBase key={i} className={`h-2.5 ${w}`} />
				))}
			</div>

			{Array.from({ length: 4 }).map((_, i) => (
				<div
					key={i}
					className="grid grid-cols-[1.6fr_2.4fr_1fr_1fr] gap-3 px-1 items-center"
					style={{ opacity: 1 - i * 0.15 }}
				>
					<SkeletonBase className="h-3 w-[55%]" />
					<div className="flex flex-col gap-1.5">
						<SkeletonBase className="h-3 w-[80%]" />
						<SkeletonBase className="h-2.5 w-[50%]" />
					</div>
					<SkeletonBase className="h-3 w-[70%] justify-self-end" />
					<SkeletonBase className="h-3 w-[70%] justify-self-end" />
				</div>
			))}

			<div className="h-px bg-border" />
			<div className="grid grid-cols-[1.6fr_2.4fr_1fr_1fr] gap-3 px-1">
				<SkeletonBase className="h-3 w-12" />
				<div />
				<SkeletonBase className="h-4 w-[80%] rounded justify-self-end" />
				<SkeletonBase className="h-4 w-[80%] rounded justify-self-end" />
			</div>
		</div>
	);
}

function JournalTable({ data }: { data: JournalData }) {
	const totalDebit = data.entries.reduce(
		(s, e) => s + toNumber(e.debit ?? 0),
		0,
	);
	const totalCredit = data.entries.reduce(
		(s, e) => s + toNumber(e.credit ?? 0),
		0,
	);
	const balanced = Math.abs(totalDebit - totalCredit) < 0.001;

	return (
		<div className="flex flex-col gap-0">
			<div className="flex items-start justify-between gap-4 mb-4">
				<span className="text-[11px] text-muted-foreground">
					{dateFormat(data.date, "long")}
				</span>
			</div>

			<div className="h-px bg-border mb-0" />

			<div
				className="grid items-center gap-x-3 px-3 py-2.5 border-b border-border"
				style={{ gridTemplateColumns: "1fr 1fr 7.5rem 7.5rem" }}
			>
				<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
					Account
				</span>
				<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
					Description
				</span>
				<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-right">
					Debit
				</span>
				<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-right">
					Credit
				</span>
			</div>

			<div className="divide-y divide-border">
				{data.entries.map((entry) => {
					const isDebit = entry.debit != null && entry.debit > 0;
					const isCredit = entry.credit != null && entry.credit > 0;
					const typeColor =
						TYPE_COLOR[entry.accountType] ?? "text-muted-foreground";

					return (
						<div
							key={entry.id}
							className={cn(
								"grid items-center gap-x-3 px-3 py-2.5",
								"hover:bg-muted/50 transition-colors duration-100",
							)}
							style={{ gridTemplateColumns: "1fr 1fr 7.5rem 7.5rem" }}
						>
							<div className="flex flex-col gap-0.5">
								<span className="font-mono text-xs font-medium text-foreground">
									{entry.accountName.toUpperCase()}
								</span>
								<span
									className={cn(
										"text-[10px] font-medium capitalize",
										typeColor,
									)}
								>
									{entry.accountType}
								</span>
							</div>

							<div className="flex flex-col gap-0.5 min-w-0">
								<div className="flex items-center gap-1.5">
									<span className="text-sm text-foreground truncate">
										{entry.narration}
									</span>
								</div>
							</div>

							<div className="text-right">
								{isDebit ? (
									<span className="flex items-center justify-end gap-1 text-sm font-medium text-foreground tabular-nums">
										{currencyFormatter(entry.debit || 0)}
									</span>
								) : (
									<span className="text-sm text-muted-foreground/30">—</span>
								)}
							</div>

							<div className="text-right">
								{isCredit ? (
									<span className="flex items-center justify-end gap-1 text-sm font-medium text-foreground tabular-nums">
										{currencyFormatter(entry.credit || 0)}
									</span>
								) : (
									<span className="text-sm text-muted-foreground/30">—</span>
								)}
							</div>
						</div>
					);
				})}
			</div>

			<div
				className="grid items-center gap-x-3 px-3 py-2.5 bg-muted/40 border-t border-border"
				style={{ gridTemplateColumns: "1fr 1fr 7.5rem 7.5rem" }}
			>
				<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
					Total
				</span>
				<div />
				<span className="text-right text-sm font-bold font-display text-foreground tabular-nums">
					{currencyFormatter(totalDebit)}
				</span>
				<span className="text-right text-sm font-bold font-display text-foreground tabular-nums">
					{currencyFormatter(totalCredit)}
				</span>
			</div>

			<div
				className={cn(
					"flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-b-xl",
					balanced
						? "bg-success text-success-foreground"
						: "bg-danger text-danger-foreground",
				)}
			>
				<AlertCircle size={11} strokeWidth={2.5} />
				{balanced
					? "Journal balanced"
					: `Out of balance by ${currencyFormatter(Math.abs(totalDebit - totalCredit))}`}
			</div>
		</div>
	);
}

export function TransactionJournal({
	source,
	sourceId,
	className,
}: TransactionJournalProps) {
	const { data, isPending, isError, error, refetch, isFetching } = useQuery({
		queryKey: journalKeys.bySource(source, sourceId),
		queryFn: () => getTransactionJournal({ data: { source, sourceId } }),
		staleTime: 1000 * 60 * 5, // 5 min
		retry: 1,
	});

	return (
		<div
			className={cn(
				"bg-card border border-border rounded-xl overflow-hidden",
				className,
			)}
		>
			{isFetching && !isPending && (
				<div className="h-[2px] w-full bg-border overflow-hidden">
					<div className="h-full w-1/2 bg-primary/50 animate-[shimmer_1.2s_ease-in-out_infinite]" />
				</div>
			)}

			<div className="p-4 md:p-5">
				{isPending && <JournalSkeleton />}

				{isError && <RouteErrorComponent error={error} reset={refetch} />}

				{!isPending && !isError && (!data || data.entries.length === 0) && (
					<EmptyState
						icon={BookOpen}
						title="No journal entries"
						description="No accounting entries have been posted for this transaction yet."
					/>
				)}

				{!isPending && !isError && data && data.entries.length > 0 && (
					<JournalTable data={data} />
				)}
			</div>
		</div>
	);
}
