import { createFileRoute } from "@tanstack/react-router";
import { ExpenseForm } from "#/features/expenses/components/expense-form";
import { ExpenseFormPending } from "#/features/expenses/components/loaders";
import { expenseQueries } from "#/features/expenses/services/query";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/(authed)/finance/expenses/new")({
	pendingComponent: ExpenseFormPending,
	component: () => {
		const { voucherNo } = Route.useLoaderData();
		return <ExpenseForm voucherNo={voucherNo} />;
	},
	head: () => ({ meta: seo({ title: "New Expense" }) }),
	staticData: {
		breadcrumb: "New Expense",
	},
	loader: async ({ context: { queryClient } }) => ({
		voucherNo: await queryClient.ensureQueryData(expenseQueries.expenseNo()),
	}),
});
