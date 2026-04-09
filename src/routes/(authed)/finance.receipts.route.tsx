import { createFileRoute, Outlet } from "@tanstack/react-router";
import { accountQueries } from "#/features/coa/services/queries";
import { districtQueries } from "#/features/districts/services/queries";
import { groupQueries } from "#/features/groups/services/queries";
import { serviceQueries } from "#/features/services/services/queries";

export const Route = createFileRoute("/(authed)/finance/receipts")({
	component: RouteComponent,
	beforeLoad: async ({ context: { queryClient } }) => {
		const [accounts, districts, groups, services, bankAccounts] =
			await Promise.all([
				queryClient.ensureQueryData(accountQueries.incomePostingAccounts()),
				queryClient.ensureQueryData(districtQueries.byCongregation()),
				queryClient.ensureQueryData(groupQueries.byCongregation()),
				queryClient.ensureQueryData(serviceQueries.byCongregation()),
				queryClient.ensureQueryData(accountQueries.bankAccounts()),
			]);
		return { accounts, districts, groups, services, bankAccounts };
	},
	staticData: {
		breadcrumb: "Receipts",
	},
});

function RouteComponent() {
	return <Outlet />;
}
