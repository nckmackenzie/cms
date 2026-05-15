import { createFileRoute } from "@tanstack/react-router";
import { BudgetForm } from "#/features/budgets/components/budget-form";
import { budgetQueries } from "#/features/budgets/services/queries";
import { seo } from "#/lib/seo";

export const Route = createFileRoute(
	"/(authed)/finance/budgets/$budgetId/edit",
)({
	component: () => {
		const { budget } = Route.useLoaderData();
		return <BudgetForm type={budget.type} initialData={budget} />;
	},
	loader: async ({ context: { queryClient }, params: { budgetId } }) => {
		const budget = await queryClient.ensureQueryData(
			budgetQueries.detail(budgetId),
		);
		return { budget };
	},
	head: () => ({ meta: seo({ title: "Edit Budget" }) }),
	staticData: {
		breadcrumb: "Edit Budget",
	},
});
