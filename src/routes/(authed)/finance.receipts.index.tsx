import { createFileRoute } from "@tanstack/react-router";
import { accountQueries } from "#/features/coa/services/queries";
import { districtQueries } from "#/features/districts/services/queries";
import { groupQueries } from "#/features/groups/services/queries";
import { ReceiptsPage } from "#/features/receipts/components/receipts-page";
import { receiptQueries } from "#/features/receipts/services/queries";
import { receiptsValidateSearch } from "#/features/receipts/utils/schema";
import { serviceQueries } from "#/features/services/services/queries";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/(authed)/finance/receipts/")({
	component: ReceiptsPage,
	head: () => ({ meta: seo({ title: "Receipts" }) }),
	validateSearch: receiptsValidateSearch,
	loader: async ({ context: { queryClient } }) => {
		const [receiptNo, accounts, districts, groups, services] =
			await Promise.all([
				queryClient.ensureQueryData(receiptQueries.receiptNo()),
				queryClient.ensureQueryData(accountQueries.incomePostingAccounts()),
				queryClient.ensureQueryData(districtQueries.byCongregation()),
				queryClient.ensureQueryData(groupQueries.byCongregation()),
				queryClient.ensureQueryData(serviceQueries.byCongregation()),
			]);
		return { receiptNo, accounts, districts, groups, services };
	},
});
