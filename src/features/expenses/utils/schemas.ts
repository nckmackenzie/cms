import { z } from "zod";
import { EXPENSE_TYPES, FUND_REQUISITION_STATUS } from "#/db/schema";
import {
	dateSchema,
	paymentMethodSchema,
	queryValidateSearch,
	stringSchema,
} from "#/lib/schemas";

export const expensesPageValidateSearch = queryValidateSearch.safeExtend({
	status: z
		.enum(["all", ...FUND_REQUISITION_STATUS])
		.optional()
		.catch("all"),
	year: z.string().optional().catch(""),
});

export const expenseFormSchema = z
	.object({
		id: z.string().optional(),
		expenseDate: dateSchema("Expense date is required"),
		expenseType: z.enum(EXPENSE_TYPES, {
			error: (iss) =>
				!iss.input ? "Expense type is required" : "Select a valid expense",
		}),
		voucherNo: z.number(),
		paymentMethod: paymentMethodSchema(),
		bankId: z.string().nullish(),
		groupId: z.string().nullish(),
		districtId: z.string().nullish(),
		reference: stringSchema("Reference is required"),
		requisitionId: z.string().nullish(),
		sourceAccountId: z.string().nullish(),
		lines: z
			.array(
				z.object({
					id: z.string(),
					accountId: stringSchema("Account is required"),
					description: z.string().optional(),
					amount: z.number().min(1, "Enter valid amount"),
				}),
			)
			.min(1, { error: "Add at least one expense line" }),
	})
	.superRefine(
		(
			{
				expenseType,
				groupId,
				districtId,
				paymentMethod,
				sourceAccountId,
				bankId,
			},
			ctx,
		) => {
			if (paymentMethod === "cash" && !sourceAccountId) {
				ctx.addIssue({
					code: "custom",
					message: "Source account is required",
					path: ["sourceAccountId"],
				});
			}
			if (paymentMethod !== "cash" && !bankId) {
				ctx.addIssue({
					code: "custom",
					message: "Bank is required",
					path: ["bankId"],
				});
			}
			if (expenseType === "group" && !groupId) {
				ctx.addIssue({
					code: "custom",
					message: "Group is required",
					path: ["groupId"],
				});
			}
			if (expenseType === "district" && !districtId) {
				ctx.addIssue({
					code: "custom",
					message: "District is required",
					path: ["districtId"],
				});
			}
		},
	);

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
