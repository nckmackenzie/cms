import { queryOptions } from "@tanstack/react-query";
import { getCongregationServices } from "./services.api";

export const serviceQueries = {
	all: ["services"],
	byCongregation: () =>
		queryOptions({
			queryKey: [...serviceQueries.all, "by-congregation"],
			queryFn: () => getCongregationServices(),
		}),
};
