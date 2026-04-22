import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import type { ExpenseType } from "#/db/schema";
import {
	getAvailableRequisitionsForExpense,
	getExpenseByPublicId,
	getExpenseRequisitionOption,
	getExpenses,
	voucherNoFn,
} from "#/features/expenses/services/expenses.api";
import type { expensesPageValidateSearch } from "#/features/expenses/utils/schemas";

export const expenseQueries = {
	all: ["expenses"] as const,
	list: (filters: z.infer<typeof expensesPageValidateSearch>) =>
		queryOptions({
			queryKey: [...expenseQueries.all, "list", filters],
			queryFn: () => getExpenses({ data: filters }),
		}),
	expenseNo: () =>
		queryOptions({
			queryKey: [...expenseQueries.all, "expenseNo"],
			queryFn: () => voucherNoFn(),
		}),
	availableRequisitions: (filters: {
		expenseType: ExpenseType;
		groupId?: string | null;
		districtId?: string | null;
	}) =>
		queryOptions({
			queryKey: [...expenseQueries.all, "available-requisitions", filters],
			queryFn: () => getAvailableRequisitionsForExpense({ data: filters }),
		}),
	currentRequisitionOption: (requisitionId: string) =>
		queryOptions({
			queryKey: [
				...expenseQueries.all,
				"current-requisition-option",
				requisitionId,
			],
			queryFn: () => getExpenseRequisitionOption({ data: requisitionId }),
		}),
	detail: (expenseId: string) =>
		queryOptions({
			queryKey: [...expenseQueries.all, "detail", expenseId],
			queryFn: () => getExpenseByPublicId({ data: expenseId }),
		}),
};
