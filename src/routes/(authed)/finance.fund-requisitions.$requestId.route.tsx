import { createFileRoute, Outlet } from "@tanstack/react-router";
import { fundRequisitionsQueries } from "#/features/funds-requisitions/services/queries";

export const Route = createFileRoute(
	"/(authed)/finance/fund-requisitions/$requestId",
)({
	beforeLoad: async ({ context: { queryClient }, params: { requestId } }) => {
		const requisition = await queryClient.ensureQueryData(
			fundRequisitionsQueries.detail(requestId),
		);

		return { requisition };
	},
	component: Outlet,
});
