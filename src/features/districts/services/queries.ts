import { queryOptions } from "@tanstack/react-query";
import { getCongregationDistricts } from "./districts.api";

export const districtQueries = {
	all: ["districts"],
	byCongregation: () =>
		queryOptions({
			queryKey: [...districtQueries.all, "by-congregation"],
			queryFn: () => getCongregationDistricts(),
		}),
};
