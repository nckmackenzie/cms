import { createFileRoute } from "@tanstack/react-router";
import { ExpenseForm } from "#/features/expenses/components/expense-form";
import { ExpenseFormPending } from "#/features/expenses/components/loaders";
import { expenseQueries } from "#/features/expenses/services/query";
import { seo } from "#/lib/seo";

export const Route = createFileRoute(
	"/(authed)/finance/expenses/$expenseId/edit",
)({
	pendingComponent: ExpenseFormPending,
	component: () => {
		const { expense } = Route.useLoaderData();
		return <ExpenseForm initialData={expense} />;
	},
	loader: async ({ context: { queryClient }, params: { expenseId } }) => {
		return {
			expense: await queryClient.ensureQueryData(
				expenseQueries.detail(expenseId),
			),
		};
	},
	head: () => ({ meta: seo({ title: `Edit Expense` }) }),
	staticData: {
		breadcrumb: (m) => `Edit Expense ${m.loaderData.expense.voucherNo}`,
	},
});
