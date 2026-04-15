import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FundRequisitionForm } from "#/features/funds-requisitions/components/requisition-form";
import { fundRequisitionsQueries } from "#/features/funds-requisitions/services/queries";
import { seo } from "#/lib/seo";

export const Route = createFileRoute(
	"/(authed)/finance/fund-requisitions/$requestId/edit",
)({
	component: () => {
		const { requisition: loaderData } = Route.useRouteContext();
		const { data: freshData } = useQuery(
			fundRequisitionsQueries.detail(Route.useParams().requestId),
		);
		const requisition = freshData ?? loaderData;
		return (
			<FundRequisitionForm
				initialData={{
					...requisition,
					amountRequested: Number(requisition.amountRequested),
				}}
			/>
		);
	},
	head: () => ({ meta: seo({ title: "Edit Fund Requisition" }) }),
	staticData: {
		breadcrumb: (m) => `Edit Requisition #${m.loaderData.requisitionNo}`,
	},
});
