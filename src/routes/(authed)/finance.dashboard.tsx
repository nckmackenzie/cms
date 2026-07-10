import { createFileRoute } from "@tanstack/react-router";
import { RouteErrorComponent } from "#/components/ui/route-components";
import { FinanceDashboardPage } from "#/features/dashboards/finance/components/finance-dashboard-page";
import { financeDashboardValidateSearch } from "#/features/dashboards/finance/lib/schemas";
import { getFinancialYears } from "#/features/fiscal-years/services/years.api";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/(authed)/finance/dashboard")({
	validateSearch: financeDashboardValidateSearch,
	component: FinanceDashboardPage,
	head: () => ({ meta: [...seo({ title: "Finance Dashboard" })] }),
	errorComponent: RouteErrorComponent,
	staticData: {
		breadcrumb: "Dashboard",
	},
	loaderDeps: ({ search }) => ({ search }),
	loader: async ({ context: { queryClient }, deps: { search } }) => {
		const [years] = await Promise.all([
			queryClient.ensureQueryData({
				queryKey: ["financial-years"],
				queryFn: getFinancialYears,
			}),
		]);

		const now = new Date();
		const selectedYear =
			years.find(({ publicId }) => search.financialYear === publicId) ??
			years.find(
				({ startDate, endDate }) =>
					now >= new Date(startDate) && now <= new Date(endDate),
			);

		return { years, selectedYear };
	},
});
