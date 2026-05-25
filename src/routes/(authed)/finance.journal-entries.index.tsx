import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { accountQueries } from "#/features/coa/services/queries";
import { getFinancialYearByDate } from "#/features/fiscal-years/services/years.api";
import { JournalEntriesPage } from "#/features/journal-entries/components/journal-entries-page";
import { journalQueries } from "#/features/journal-entries/services/queries";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/(authed)/finance/journal-entries/")({
	component: JournalEntriesPage,
	head: () => ({ meta: seo({ title: "Journal Entries" }) }),
	staticData: {
		breadcrumb: "Journal Entries",
	},
	validateSearch: z.object({
		public_id: z
			.uuid({ error: "Selected journal entry is invalid" })
			.optional()
			.catch(undefined),
	}),
	loader: async ({ context: { queryClient } }) => {
		const [accounts, allAccounts, currentFiscalYear] = await Promise.all([
			queryClient.ensureQueryData(accountQueries.postingAccounts()),
			queryClient.ensureQueryData(accountQueries.list({})),
			getFinancialYearByDate(),
		]);
		const journalNo = await queryClient.ensureQueryData(
			journalQueries.journalNo(currentFiscalYear.startDate),
		);
		return { accounts, journalNo, allAccounts, currentFiscalYear };
	},
});
