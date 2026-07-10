import { z } from "zod";
import { nullableTrimmedString } from "#/lib/schemas";

export const financeDashboardValidateSearch = z.object({
	financialYear: nullableTrimmedString,
});

export type FinanceDashboardValidateSearch = z.infer<
	typeof financeDashboardValidateSearch
>;
