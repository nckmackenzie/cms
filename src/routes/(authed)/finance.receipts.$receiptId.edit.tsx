import { createFileRoute } from "@tanstack/react-router";
import { Wrapper } from "#/components/ui/base-page";
import { ReceiptsFormPending } from "#/features/receipts/components/loaders";
import { ReceiptsForm } from "#/features/receipts/components/receipt-form";
import { receiptQueries } from "#/features/receipts/services/queries";
import { seo } from "#/lib/seo";

export const Route = createFileRoute(
	"/(authed)/finance/receipts/$receiptId/edit",
)({
	component: RouteComponent,
	pendingComponent: ReceiptsFormPending,
	head: () => ({ meta: seo({ title: "Edit Receipt" }) }),
	loader: async ({ context: { queryClient }, params: { receiptId } }) => {
		const receipt = await queryClient.ensureQueryData(
			receiptQueries.detail(receiptId),
		);
		return { receipt };
	},
	staticData: {
		breadcrumb: (p) => `Edit Receipt #${p.loaderData.receipt.receiptNo}`,
	},
});

function RouteComponent() {
	const { receipt } = Route.useLoaderData();
	return (
		<Wrapper size="full">
			<ReceiptsForm receiptId={receipt.id} initialValues={receipt} />
		</Wrapper>
	);
}
