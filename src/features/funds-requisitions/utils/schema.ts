import { z } from "zod";
import {
	FUND_REQUISITION_STATUS,
	FUND_REQUISITION_TYPE,
	PAYMENT_METHODS,
} from "#/db/schema";
import { queryValidateSearch } from "#/lib/schemas";

export const fundsRequisitionValidateSearch = queryValidateSearch.safeExtend({
	status: z
		.enum(["all", ...FUND_REQUISITION_STATUS])
		.optional()
		.catch("all"),
});

export const fundsRequisitionFormValues = z
	.object({
		id: z.string().optional(),
		requisitionNo: z.number().min(1, "Requisition number is required"),
		requisitionDate: z.iso
			.date({
				error: (iss) =>
					!iss.input ? "Requisition date is required" : "Invalid date selected",
			})
			.refine(
				(val) =>
					new Date(val).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0),
				{ error: "Requisition date cannot be in the future" },
			),
		requestType: z.enum(FUND_REQUISITION_TYPE, {
			error: (iss) =>
				!iss.input
					? "Request type is required"
					: "Invalid request type selected",
		}),
		amountRequested: z.number().min(1, "Provide a valid amount"),
		purpose: z.string().min(1, "Purpose is required"),
		districtId: z.string().nullish(),
		groupId: z.string().nullish(),
		churchCategoryId: z.string().nullish(),
		dontDeduct: z.boolean(),
	})
	.superRefine(
		({ requestType, districtId, groupId, churchCategoryId }, ctx) => {
			if (requestType === "district" && !districtId) {
				ctx.addIssue({
					code: "custom",
					message: "District is required",
					path: ["districtId"],
				});
			}
			if (requestType === "group" && !groupId) {
				ctx.addIssue({
					code: "custom",
					message: "Group is required",
					path: ["groupId"],
				});
			}
			if (requestType === "church" && !churchCategoryId) {
				ctx.addIssue({
					code: "custom",
					message: "Church category is required",
					path: ["churchCategoryId"],
				});
			}
		},
	);

export const actionRequisitionFormValues = z
	.object({
		id: z.string(),
		paymentMethod: z.enum(PAYMENT_METHODS, {
			error: (iss) =>
				!iss.input
					? "Select payment method"
					: "Invalid payment method selected",
		}),
		paymentDate: z.iso
			.date({
				error: (iss) =>
					!iss.input ? "Select payment date" : "Invalid date selected",
			})
			.refine(
				(val) =>
					new Date(val).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0),
				{ error: "Requisition date cannot be in the future" },
			),
		bankId: z.string().nullish(),
		debitingAccountId: z.string().min(1, "Select account"),
		creditingAccountId: z.string().min(1, "Select account").nullish(),
		amountRequested: z.number().min(1, "Enter a valid amount"),
		amountApproved: z.number().min(1, "Enter a valid amount"),
		reference: z.string().min(3, "Provide a valid reference"),
	})
	.superRefine((data, ctx) => {
		if (data.paymentMethod !== "cash" && !data.bankId) {
			ctx.addIssue({
				code: "custom",
				message: "Select a bank",
				path: ["bankId"],
			});
		}
		if (data.paymentMethod === "cash" && !data.creditingAccountId) {
			ctx.addIssue({
				code: "custom",
				message: "Select account to be credited",
				path: ["creditingAccountId"],
			});
		}
		if (data.amountApproved > data.amountRequested) {
			ctx.addIssue({
				code: "custom",
				message: "Amount approved cannot be greater than amount requested",
				path: ["amountApproved"],
			});
		}
		if (data.debitingAccountId === data.creditingAccountId) {
			ctx.addIssue({
				code: "custom",
				message: "Accounts cannot be the same",
				path: ["debitingAccountId"],
			});
		}
		if (data.bankId && data.bankId === data.debitingAccountId) {
			ctx.addIssue({
				code: "custom",
				message: "Accounts cannot be the same",
				path: ["bankId"],
			});
		}
	});

export type FundsRequisitionValidateForm = z.infer<
	typeof fundsRequisitionFormValues
>;

export type ActionRequisitionValidateForm = z.infer<
	typeof actionRequisitionFormValues
>;
