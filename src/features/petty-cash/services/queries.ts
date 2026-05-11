import { queryOptions } from "@tanstack/react-query";
import {
	getPettyCashReceipt,
	getPettyCashReceipts,
} from "#/features/petty-cash/services/petty-cash.api";
import type { PettyCashValidateSearch } from "#/features/petty-cash/utils/schemas";

export const pettyCashQueries = {
	all: ["petty-cash"] as const,
	list: (filters: PettyCashValidateSearch) =>
		queryOptions({
			queryKey: [...pettyCashQueries.all, "list", filters],
			queryFn: () => getPettyCashReceipts({ data: filters }),
		}),
	detail: (pettyCashId: string) =>
		queryOptions({
			queryKey: [...pettyCashQueries.all, "detail", pettyCashId],
			queryFn: () => getPettyCashReceipt({ data: pettyCashId }),
		}),
};
