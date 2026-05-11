import { createFileRoute } from "@tanstack/react-router";
import { BasePageLoadingSkeleton } from "#/components/ui/base-page";
import { PettyCashPage } from "#/features/petty-cash/components/petty-cash-page";
import { pettyCashValidateSearch } from "#/features/petty-cash/utils/schemas";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/(authed)/finance/petty-cash/")({
	component: PettyCashPage,
	head: () => ({ meta: seo({ title: "Petty Cash" }) }),
	validateSearch: pettyCashValidateSearch,
	pendingComponent: () => (
		<BasePageLoadingSkeleton pageTitle="Petty Cash Receipts" />
	),
});
