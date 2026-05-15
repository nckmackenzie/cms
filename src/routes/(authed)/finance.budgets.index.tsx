import { createFileRoute } from "@tanstack/react-router";
import { BudgetsPage } from "#/features/budgets/components/budgets-page";
import { queryValidateSearch } from "#/lib/schemas";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/(authed)/finance/budgets/")({
	component: BudgetsPage,
	validateSearch: queryValidateSearch,
	head: () => ({ meta: seo({ title: "Budgets" }) }),
});
