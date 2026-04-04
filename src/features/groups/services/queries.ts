import { queryOptions } from "@tanstack/react-query";
import { getCongregationGroups } from "./groups.api";

export const groupQueries = {
	all: ["groups"],
	byCongregation: () =>
		queryOptions({
			queryKey: [...groupQueries.all, "by-congregation"],
			queryFn: () => getCongregationGroups(),
		}),
};
