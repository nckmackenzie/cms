import { queryOptions } from "@tanstack/react-query";
import {
	getReceipt,
	getReceiptNoServerFn,
	getReceipts,
} from "#/features/receipts/services/receipts.api";
import type { ReceiptsValidateSearch } from "#/features/receipts/utils/schema";

export const receiptQueries = {
	all: ["receipts"] as const,
	list: (filters: ReceiptsValidateSearch) =>
		queryOptions({
			queryKey: [...receiptQueries.all, "list", filters],
			queryFn: () => getReceipts({ data: filters }),
		}),
	detail: (receiptId: string) =>
		queryOptions({
			queryKey: [...receiptQueries.all, "detail", receiptId],
			queryFn: () => getReceipt({ data: receiptId }),
		}),
	receiptNo: () =>
		queryOptions({
			queryKey: [...receiptQueries.all, "receiptNo"],
			queryFn: () => getReceiptNoServerFn(),
		}),
};
