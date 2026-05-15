import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BudgetForm } from "#/features/budgets/components/budget-form";
// import { budgetQueries } from "#/features/budgets/services/queries";
// import {
// 	getFinancialYearByDate,
// 	getFinancialYears,
// } from "#/features/fiscal-years/services/years.api";
// import { groupQueries } from "#/features/groups/services/queries";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/(authed)/finance/budgets/new")({
	component: () => {
		const { type } = Route.useSearch();
		return <BudgetForm type={type} />;
	},
	validateSearch: z.object({
		type: z.enum(["church", "group"]).catch("church"),
	}),
	head: () => ({ meta: seo({ title: "New Budget" }) }),
	staticData: {
		breadcrumb: "New Budget",
	},
	// loader: async ({ context: { queryClient } }) => {
	// 	const [groups, churchAccounts, groupAccounts, financialYears, currentYear] =
	// 		await Promise.all([
	// 			queryClient.ensureQueryData(groupQueries.byCongregation()),
	// 			queryClient.ensureQueryData(budgetQueries.expenseAccounts("church")),
	// 			queryClient.ensureQueryData(budgetQueries.expenseAccounts("group")),
	// 			getFinancialYears(),
	// 			getFinancialYearByDate(),
	// 		]);
	// 	return {
	// 		groups,
	// 		churchAccounts,
	// 		groupAccounts,
	// 		financialYears,
	// 		currentYear,
	// 	};
	// },
});
