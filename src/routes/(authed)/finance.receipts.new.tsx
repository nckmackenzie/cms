import { createFileRoute } from "@tanstack/react-router";
import { Wrapper } from "#/components/ui/base-page";
import { ReceiptsFormPending } from "#/features/receipts/components/loaders";
import { ReceiptsForm } from "#/features/receipts/components/receipt-form";
import { receiptQueries } from "#/features/receipts/services/queries";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/(authed)/finance/receipts/new")({
	component: RouteComponent,
	pendingComponent: ReceiptsFormPending,
	head: () => ({ meta: seo({ title: "New Receipt" }) }),
	loader: async ({ context: { queryClient } }) => {
		const [receiptNo] = await Promise.all([
			queryClient.ensureQueryData(receiptQueries.receiptNo()),
		]);
		return { receiptNo };
	},
});

function RouteComponent() {
	const { receiptNo } = Route.useLoaderData();
	return (
		<Wrapper size="full">
			<ReceiptsForm receiptNo={receiptNo} />
		</Wrapper>
	);
}
