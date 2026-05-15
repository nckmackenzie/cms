import { createFileRoute, Outlet } from "@tanstack/react-router";
import { budgetQueries } from "#/features/budgets/services/queries";
import {
	getFinancialYearByDate,
	getFinancialYears,
} from "#/features/fiscal-years/services/years.api";
import { groupQueries } from "#/features/groups/services/queries";

export const Route = createFileRoute("/(authed)/finance/budgets")({
	beforeLoad: async ({ context: { queryClient } }) => {
		const [groups, churchAccounts, groupAccounts, financialYears, currentYear] =
			await Promise.all([
				queryClient.ensureQueryData(groupQueries.byCongregation()),
				queryClient.ensureQueryData(budgetQueries.expenseAccounts("church")),
				queryClient.ensureQueryData(budgetQueries.expenseAccounts("group")),
				getFinancialYears(),
				getFinancialYearByDate(),
			]);
		return {
			groups,
			churchAccounts,
			groupAccounts,
			financialYears,
			currentYear,
		};
	},
	component: Outlet,
	staticData: {
		breadcrumb: "Budgets",
	},
});
