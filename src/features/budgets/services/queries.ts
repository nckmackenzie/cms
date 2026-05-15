import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import type { queryValidateSearch } from "#/lib/schemas";
import {
	type BudgetType,
	getBudgetById,
	getBudgetExpenseAccounts,
	getBudgets,
} from "./budget-accounts.api";

export const budgetQueries = {
	all: ["budgets"],
	list: (search: z.infer<typeof queryValidateSearch>) =>
		queryOptions({
			queryKey: [...budgetQueries.all, "list", search],
			queryFn: () => getBudgets({ data: search }),
		}),
	detail: (budgetId: string) =>
		queryOptions({
			queryKey: [...budgetQueries.all, "detail", budgetId],
			queryFn: () => getBudgetById({ data: budgetId }),
		}),
	expenseAccounts: (type: BudgetType) =>
		queryOptions({
			queryKey: [...budgetQueries.all, "expense-accounts", type],
			queryFn: () => getBudgetExpenseAccounts({ data: { type } }),
		}),
};
