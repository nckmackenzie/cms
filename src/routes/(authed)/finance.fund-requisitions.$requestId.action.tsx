import { createFileRoute } from "@tanstack/react-router";
import { accountQueries } from "#/features/coa/services/queries";
import { FundRequisitionActionForm } from "#/features/funds-requisitions/components/fund-requisition-action-form";
import { seo } from "#/lib/seo";

export const Route = createFileRoute(
	"/(authed)/finance/fund-requisitions/$requestId/action",
)({
	component: FundRequisitionActionForm,
	staticData: {
		breadcrumb: "Approve/Reject Requisition",
	},
	head: () => ({ meta: seo({ title: "Approve/Reject Requisition" }) }),
	loader: async ({ context: { queryClient } }) => {
		const [banks, accounts, sourceAccounts] = await Promise.all([
			queryClient.ensureQueryData(accountQueries.bankAccounts()),
			queryClient.ensureQueryData(accountQueries.postingAccounts("asset")),
			queryClient.ensureQueryData(accountQueries.postingAccounts()),
		]);
		return {
			banks,
			accounts,
			sourceAccounts,
		};
	},
});
