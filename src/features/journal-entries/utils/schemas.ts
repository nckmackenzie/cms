import { z } from "zod";
import { dateSchema } from "#/lib/schemas";

export const journalEntrySchema = z.object({
	id: z.string().optional(),
	date: dateSchema("Journal date is required"),
	journalNo: z.number().positive("Journal number must be a positive number"),
	journalLines: z
		.array(
			z
				.object({
					id: z.string(),
					accountId: z.string().min(1, { error: "Account is required" }),
					debit: z.number().optional(),
					credit: z.number().optional(),
					description: z.string().nullish(),
				})
				.superRefine(({ credit = 0, debit = 0 }, ctx) => {
					if (debit < 0) {
						ctx.addIssue({
							code: "custom",
							message: "Debit cannot be negative",
							path: ["debit"],
						});
					}
					if (credit < 0) {
						ctx.addIssue({
							code: "custom",
							message: "Credit cannot be negative",
							path: ["credit"],
						});
					}
					if ((debit > 0 && credit > 0) || (debit <= 0 && credit <= 0)) {
						ctx.addIssue({
							code: "custom",
							message: "Enter either a debit or a credit",
							path: ["credit"],
						});
					}
				}),
		)
		.min(1, { message: "At least one journal line is required" }),
});

export type JournalEntry = z.infer<typeof journalEntrySchema>;
