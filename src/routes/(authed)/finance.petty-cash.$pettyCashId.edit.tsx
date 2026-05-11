import { createFileRoute } from "@tanstack/react-router";
import { PettyCashReceiptForm } from "#/features/petty-cash/components/petty-cash-receipt-form";
import { pettyCashQueries } from "#/features/petty-cash/services/queries";
import { seo } from "#/lib/seo";

export const Route = createFileRoute(
	"/(authed)/finance/petty-cash/$pettyCashId/edit",
)({
	component: RouteComponent,
	head: () => ({ meta: seo({ title: "Edit Petty Cash Receipt" }) }),
	staticData: {
		breadcrumb: "Edit Petty Cash Receipt",
	},
	loader: async ({ context: { queryClient }, params: { pettyCashId } }) => {
		const receipt = await queryClient.ensureQueryData(
			pettyCashQueries.detail(pettyCashId),
		);
		return { receipt };
	},
});

function RouteComponent() {
	const { receipt } = Route.useLoaderData();
	return <PettyCashReceiptForm initialData={receipt} />;
}
