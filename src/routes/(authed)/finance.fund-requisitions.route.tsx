import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RouteErrorComponent } from "#/components/ui/route-components";
import { districtQueries } from "#/features/districts/services/queries";
import { groupQueries } from "#/features/groups/services/queries";

export const Route = createFileRoute("/(authed)/finance/fund-requisitions")({
	beforeLoad: async ({ context: { queryClient } }) => {
		const [districts, groups] = await Promise.all([
			queryClient.ensureQueryData(districtQueries.byCongregation()),
			queryClient.ensureQueryData(groupQueries.byCongregation()),
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
		};
	},
	component: () => <Outlet />,
	staticData: {
		breadcrumb: "Fund Requisitions",
	},
	errorComponent: ({ error, reset }) => (
		<RouteErrorComponent error={error} reset={reset} />
	),
});
