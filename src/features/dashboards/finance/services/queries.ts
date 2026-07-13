import { queryOptions } from "@tanstack/react-query";
import type { FinanceDashboardValidateSearch } from "../lib/schemas";
import {
	getBudgetVsActual,
	getDashboardStats,
	getExpenseAccountability,
	getLatestFundRequisitions,
	getReceiptsByDistrict,
} from "./dashboard.api";

export const financeDashboardQueries = {
	all: ["finance-dashboard"] as const,
	statCards: (filters: FinanceDashboardValidateSearch) =>
		queryOptions({
			queryKey: [...financeDashboardQueries.all, "stat-cards", filters],
			queryFn: () => getDashboardStats({ data: filters }),
		}),
	receiptsByDistrict: (filters: FinanceDashboardValidateSearch) =>
		queryOptions({
			queryKey: [
				...financeDashboardQueries.all,
				"receipts-by-district",
				filters,
			],
			queryFn: () => getReceiptsByDistrict({ data: filters }),
		}),
	latestFundRequisitions: (filters: FinanceDashboardValidateSearch) =>
		queryOptions({
			queryKey: [
				"fund-requisitions",
				...financeDashboardQueries.all,
				"latest-fund-requisitions",
				filters,
			],
			queryFn: () => getLatestFundRequisitions({ data: filters }),
		}),
	budgetVsActual: (filters: FinanceDashboardValidateSearch) =>
		queryOptions({
			queryKey: [...financeDashboardQueries.all, "budget-vs-actual", filters],
			queryFn: () => getBudgetVsActual({ data: filters }),
		}),
	expenseAccountability: (filters: FinanceDashboardValidateSearch) =>
		queryOptions({
			queryKey: [
				"fund-requisitions",
				...financeDashboardQueries.all,
				"expense-accountability",
				filters,
			],
			queryFn: () => getExpenseAccountability({ data: filters }),
		}),
};
