import { getRouteApi } from "@tanstack/react-router";
import { ErrorBoundaryWithSuspense } from "#/components/ui/error-boundary-with-suspense";
import { PageHeader } from "#/components/ui/page-header";
import { CustomSelect } from "#/components/ui/select";
import { useFilters } from "#/hooks/use-filters";
import { FinanceStatCards, FinanceStatCardsSkeleton } from "./stat-cards";

const route = getRouteApi("/(authed)/finance/dashboard");

export function FinanceDashboardPage() {
	const { setFilters, filters } = useFilters(route.id);
	const { years, selectedYear } = route.useLoaderData();
	const effectiveFilters = {
		...filters,
		financialYear: filters.financialYear ?? selectedYear?.publicId,
	};

	return (
		<div className="space-y-8">
			<PageHeader
				title="Finance Dashboard"
				description={
					selectedYear
						? `Overview for financial year ${selectedYear.yearName}`
						: "Financial overview"
				}
				content={
					<CustomSelect
						onChange={(val) => setFilters({ financialYear: val ?? undefined })}
						value={filters.financialYear ?? selectedYear?.publicId}
						placeholder="Select financial year"
						options={years.map(({ publicId, yearName }) => ({
							value: publicId,
							label: yearName,
						}))}
						className="max-w-xs"
					/>
				}
			/>
			<ErrorBoundaryWithSuspense loader={<FinanceStatCardsSkeleton />}>
				<FinanceStatCards filters={effectiveFilters} />
			</ErrorBoundaryWithSuspense>
		</div>
	);
}
