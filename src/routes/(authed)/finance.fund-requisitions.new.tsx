import { createFileRoute } from "@tanstack/react-router";
import { FundRequisitionForm } from "#/features/funds-requisitions/components/requisition-form";
import { requisitionNoFn } from "#/features/funds-requisitions/services/funds-requisition.api";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/(authed)/finance/fund-requisitions/new")(
	{
		component: () => {
			const { requisitionNo } = Route.useLoaderData();
			return <FundRequisitionForm requisitionNo={requisitionNo} />;
		},
		staticData: {
			breadcrumb: "New Requisition",
		},
		head: () => ({ meta: seo({ title: "New Fund Requisition" }) }),
		loader: async () => ({
			requisitionNo: await requisitionNoFn(),
		}),
	},
);
