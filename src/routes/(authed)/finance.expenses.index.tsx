import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { BasePageLoadingSkeleton } from "#/components/ui/base-page";
import { ExpensesPage } from "#/features/expenses/components/expenses-page";
import { expensesPageValidateSearch } from "#/features/expenses/utils/schemas";
import { getFinancialYears } from "#/features/fiscal-years/services/years.api";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/(authed)/finance/expenses/")({
	component: ExpensesPage,
	validateSearch: expensesPageValidateSearch,
	head: () => ({ meta: seo({ title: "Expenses" }) }),
	search: {
		middlewares: [stripSearchParams({ status: "all", search: "" })],
	},
	loader: async () => ({ years: await getFinancialYears() }),
	pendingComponent: () => <BasePageLoadingSkeleton />,
});
