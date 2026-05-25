import { queryOptions } from "@tanstack/react-query";
import type { JournalSearchInput } from "@/features/journal-entries/services/journal-entries.api";
import {
	getJournalEntries,
	getJournalNo,
	searchJournalEntries,
} from "@/features/journal-entries/services/journal-entries.api";

export const journalQueries = {
	all: ["journal"] as const,
	journalNo: (date?: string) =>
		queryOptions({
			queryKey: [...journalQueries.all, "journal-no", date],
			queryFn: () => getJournalNo({ data: date }),
		}),
	journal: (publicId: string) =>
		queryOptions({
			queryKey: [...journalQueries.all, "detail", publicId],
			queryFn: () => getJournalEntries({ data: { publicId } }),
		}),
	search: (filters: JournalSearchInput) =>
		queryOptions({
			queryKey: [...journalQueries.all, "search", filters],
			queryFn: () => searchJournalEntries({ data: filters }),
		}),
};
