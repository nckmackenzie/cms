import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { BasePageLoadingSkeleton } from "#/components/ui/base-page";
import { FundRequisitionsPage } from "#/features/funds-requisitions/components/fund-requisitions-page";
import { fundsRequisitionValidateSearch } from "#/features/funds-requisitions/utils/schema";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/(authed)/finance/fund-requisitions/")({
	component: FundRequisitionsPage,
	head: () => ({ meta: seo({ title: "Fund Requisitions" }) }),
	validateSearch: fundsRequisitionValidateSearch,
	pendingComponent: () => (
		<BasePageLoadingSkeleton pageTitle="Fund Requisitions" />
	),
	search: {
		middlewares: [stripSearchParams({ status: "all" })],
	},
});
