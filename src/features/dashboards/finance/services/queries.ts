import { queryOptions } from "@tanstack/react-query";
import type { FinanceDashboardValidateSearch } from "../lib/schemas";
import { getDashboardStats } from "./dashboard.api";

export const financeDashboardQueries = {
	all: ["finance-dashboard"] as const,
	statCards: (filters: FinanceDashboardValidateSearch) =>
		queryOptions({
			queryKey: [...financeDashboardQueries.all, "stat-cards", filters],
			queryFn: () => getDashboardStats({ data: filters }),
		}),
};
