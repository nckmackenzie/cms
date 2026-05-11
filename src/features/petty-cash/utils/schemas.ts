import { z } from "zod";
import { dateSchema, queryValidateSearch } from "#/lib/schemas";

export const pettyCashFormSchema = z.object({
	id: z.string().optional(),
	receiptDate: dateSchema("Receipt Date is required"),
	amount: z.number().positive("Amount must be greater than 0"),
	bankId: z.string().min(1, "Bank is required"),
	description: z.string().optional(),
	reference: z.string().min(1, "Reference is required"),
	creditingAccountId: z.string().min(1, "Crediting account is required"),
});

export const pettyCashValidateSearch = queryValidateSearch.safeExtend({
	dateRange: z
		.object({
			from: z.iso.date(),
			to: z.iso.date(),
		})
		.superRefine((data, ctx) => {
			if (new Date(data.from) > new Date(data.to)) {
				ctx.addIssue({
					code: "custom",
					message: "From date must be before to date",
					path: ["from"],
				});
			}
		})
		.optional(),
});

export type PettyCashReceiptValues = z.infer<typeof pettyCashFormSchema>;
export type PettyCashValidateSearch = z.infer<typeof pettyCashValidateSearch>;
