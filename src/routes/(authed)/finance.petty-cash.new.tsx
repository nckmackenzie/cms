import { createFileRoute } from "@tanstack/react-router";
import { PettyCashReceiptForm } from "#/features/petty-cash/components/petty-cash-receipt-form";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/(authed)/finance/petty-cash/new")({
	component: PettyCashReceiptForm,
	head: () => ({ meta: seo({ title: "New Petty Cash Receipt" }) }),
	staticData: {
		breadcrumb: "New Petty Cash Receipt",
	},
});
