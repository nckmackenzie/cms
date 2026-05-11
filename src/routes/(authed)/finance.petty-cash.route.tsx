import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RouteErrorComponent } from "#/components/ui/route-components";
import { accountQueries } from "#/features/coa/services/queries";

export const Route = createFileRoute("/(authed)/finance/petty-cash")({
	beforeLoad: async ({ context: { queryClient } }) => {
		const [banks, destinationAccounts] = await Promise.all([
			queryClient.ensureQueryData(accountQueries.bankAccounts()),
			queryClient.ensureQueryData(accountQueries.postingAccounts("asset")),
		]);

		return { banks, destinationAccounts };
	},
	component: Outlet,
	staticData: {
		breadcrumb: "Petty Cash",
	},
	errorComponent: ({ error, reset }) => (
		<RouteErrorComponent error={error} reset={reset} />
	),
});
