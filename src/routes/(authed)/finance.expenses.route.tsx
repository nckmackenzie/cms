import { createFileRoute, Outlet } from "@tanstack/react-router";
import { accountQueries } from "#/features/coa/services/queries";
import { districtQueries } from "#/features/districts/services/queries";
import { groupQueries } from "#/features/groups/services/queries";

export const Route = createFileRoute("/(authed)/finance/expenses")({
	beforeLoad: async ({ context: { queryClient } }) => {
		const [districts, groups, banks, expenseAccounts, assetAccounts] =
			await Promise.all([
				queryClient.ensureQueryData(districtQueries.byCongregation()),
				queryClient.ensureQueryData(groupQueries.byCongregation()),
				queryClient.ensureQueryData(accountQueries.bankAccounts()),
				queryClient.ensureQueryData(accountQueries.postingAccounts("expense")),
				queryClient.ensureQueryData(accountQueries.postingAccounts("asset")),
			]);
		return {
			districts: districts.map((d) => ({
				value: d.value,
				label: d.label.toUpperCase(),
			})),
			groups: groups.map((g) => ({
				value: g.value,
				label: g.label.toUpperCase(),
			})),
			banks,
			expenseAccounts,
			assetAccounts,
		};
	},
	component: Outlet,
	staticData: {
		breadcrumb: "Expenses",
	},
});
