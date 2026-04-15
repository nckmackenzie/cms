import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import {
	getRequisition,
	getRequisitions,
} from "#/features/funds-requisitions/services/funds-requisition.api";
import type { queryValidateSearch } from "#/lib/schemas";

export const fundRequisitionsQueries = {
	all: ["fund-requisitions"],
	list: (filters: z.infer<typeof queryValidateSearch>) =>
		queryOptions({
			queryKey: [...fundRequisitionsQueries.all, "list", filters],
			queryFn: () => getRequisitions({ data: filters }),
		}),
	detail: (requisitionId: string) =>
		queryOptions({
			queryKey: [...fundRequisitionsQueries.all, requisitionId],
			queryFn: () => getRequisition({ data: requisitionId }),
		}),
};
