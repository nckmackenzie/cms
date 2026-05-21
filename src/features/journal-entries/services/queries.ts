import { queryOptions } from "@tanstack/react-query";
import {
	getJournalEntries,
	getJournalNo,
} from "@/features/journal-entries/services/journal-entries.api";

export const journalQueries = {
	all: ["journal"] as const,
	journalNo: (date?: string) =>
		queryOptions({
			queryKey: [...journalQueries.all, "journal-no", date],
			queryFn: () => getJournalNo({ data: date }),
		}),
	journal: (journalNo: number, date?: string) =>
		queryOptions({
			queryKey: [...journalQueries.all, "detail", journalNo, date],
			queryFn: () => getJournalEntries({ data: { journalNo, date } }),
		}),
};
