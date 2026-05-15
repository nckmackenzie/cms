import { z } from "zod";

export const budgetFormSchema = z.object({
	id: z.string().optional(),
	type: z.enum(["church", "group"]),
	financialYearId: z.string().min(1, "Financial year is required"),
	groupId: z.string().optional(),
	accounts: z.array(
		z.object({
			id: z.string(),
			amount: z.number(),
		}),
	),
});

export type BudgetFormSchema = z.infer<typeof budgetFormSchema>;
