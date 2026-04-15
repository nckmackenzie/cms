import { z } from "zod";

export const sheetSchema = z.object({
	sheet: z.enum(["new", "edit"]).optional(),
});

export const queryValidateSearch = z.object({
	search: z.string().optional().catch(""),
});
export const queryValidateSearchWithSheet = queryValidateSearch.safeExtend({
	sheet: z.enum(["new", "edit"]).optional(),
});

export const stringSchema = (errorMessage: string) =>
	z.string().min(1, { error: errorMessage });
